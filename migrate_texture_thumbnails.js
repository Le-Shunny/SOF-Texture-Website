const { createClient } = require('@supabase/supabase-js');

// Load environment variables (assuming .env is set up)
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Use anon key for public operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateThumbnails() {
  console.log('Starting thumbnail migration from thumbnails to texture-thumbnails bucket...');

  try {
    // List files in the old thumbnails bucket
    const { data: files, error: listError } = await supabase.storage
      .from('thumbnails')
      .list('', { limit: 1000 }); // Adjust limit if needed

    if (listError) {
      console.error('Error listing files in thumbnails bucket:', listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log('No files found in thumbnails bucket.');
      return;
    }

    console.log(`Found ${files.length} files to migrate.`);

    for (const file of files) {
      if (!file.name) continue;

      try {
        // Download the file from old bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('thumbnails')
          .download(file.name);

        if (downloadError) {
          console.error(`Error downloading ${file.name}:`, downloadError);
          continue;
        }

        // Upload to new bucket
        const { error: uploadError } = await supabase.storage
          .from('texture-thumbnails')
          .upload(file.name, fileData, {
            upsert: true // Overwrite if exists
          });

        if (uploadError) {
          console.error(`Error uploading ${file.name} to texture-thumbnails:`, uploadError);
        } else {
          console.log(`Successfully migrated ${file.name}`);
        }
      } catch (err) {
        console.error(`Unexpected error migrating ${file.name}:`, err);
      }
    }

    console.log('Thumbnail migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrateThumbnails();