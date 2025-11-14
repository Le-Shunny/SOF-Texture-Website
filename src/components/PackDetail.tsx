import { useState, useEffect } from 'react';
import { supabase, Pack, PackComment, PackVote, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Download, ThumbsUp, ThumbsDown, MessageSquare, User, Package, Archive, X } from 'lucide-react';
import JSZip from 'jszip';

interface PackDetailProps {
  pack: Pack;
  onClose: () => void;
  onViewProfile: (username: string) => void;
}

export default function PackDetail({ pack, onClose, onViewProfile }: PackDetailProps) {
  const { user } = useAuth();
  const [textures, setTextures] = useState<Texture[]>([]);
  const [comments, setComments] = useState<PackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userVote, setUserVote] = useState<PackVote | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPack, setDownloadingPack] = useState(false);

  useEffect(() => {
    fetchPackData();
  }, [pack.id]);

  const fetchPackData = async () => {
    setLoading(true);

    // Fetch textures in pack
    if (pack.texture_ids && pack.texture_ids.length > 0) {
      const { data: texturesData, error: texError } = await supabase
        .from('textures')
        .select('*')
        .in('id', pack.texture_ids);

      if (!texError && texturesData) {
        setTextures(texturesData);
      }
    }

    // Fetch comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('pack_comments')
      .select('*')
      .eq('pack_id', pack.id)
      .order('created_at', { ascending: true });

    if (!commentsError && commentsData) {
      setComments(commentsData);
    }

    // Fetch user vote
    if (user) {
      const { data: voteData, error: voteError } = await supabase
        .from('pack_votes')
        .select('*')
        .eq('pack_id', pack.id)
        .eq('user_id', user.id)
        .single();

      if (!voteError && voteData) {
        setUserVote(voteData);
      }
    }

    setLoading(false);
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) return;

    try {
      if (userVote) {
        if (userVote.vote_type === voteType) {
          // Remove vote
          await supabase.from('pack_votes').delete().eq('id', userVote.id);
          setUserVote(null);
          // Update pack votes
          const updateField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
          await supabase
            .from('packs')
            .update({ [updateField]: pack[updateField] - 1 })
            .eq('id', pack.id);
          pack[updateField] -= 1;
        } else {
          // Change vote
          await supabase
            .from('pack_votes')
            .update({ vote_type: voteType })
            .eq('id', userVote.id);
          setUserVote({ ...userVote, vote_type: voteType });
          // Update counts
          const oldField = userVote.vote_type === 'upvote' ? 'upvotes' : 'downvotes';
          const newField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
          await supabase
            .from('packs')
            .update({
              [oldField]: pack[oldField] - 1,
              [newField]: pack[newField] + 1
            })
            .eq('id', pack.id);
          pack[oldField] -= 1;
          pack[newField] += 1;
        }
      } else {
        // Add vote
        const { data, error } = await supabase
          .from('pack_votes')
          .insert({
            pack_id: pack.id,
            user_id: user.id,
            vote_type: voteType
          })
          .select()
          .single();

        if (!error && data) {
          setUserVote(data);
          const updateField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
          await supabase
            .from('packs')
            .update({ [updateField]: pack[updateField] + 1 })
            .eq('id', pack.id);
          pack[updateField] += 1;
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('pack_comments')
        .insert({
          pack_id: pack.id,
          user_id: user.id,
          author_name: user.user_metadata?.username || 'Anonymous',
          content: newComment.trim()
        })
        .select()
        .single();

      if (!error && data) {
        setComments([...comments, data]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const downloadTexture = async (texture: Texture) => {
    try {
      const response = await fetch(texture.texture_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${texture.title}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Increment download count
      await supabase
        .from('textures')
        .update({ download_count: texture.download_count + 1 })
        .eq('id', texture.id);
    } catch (error) {
      console.error('Error downloading texture:', error);
    }
  };

  const downloadPack = async () => {
    setDownloadingPack(true);
    try {
      const zip = new JSZip();

      for (const texture of textures) {
        const response = await fetch(texture.texture_url);
        const blob = await response.blob();
        zip.file(`${texture.title}.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pack.title}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading pack:', error);
    }
    setDownloadingPack(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading pack details...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-bold">{pack.title}</h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
        <div className="md:flex">
          <div className="md:w-1/3">
            <img
              src={pack.thumbnail_url}
              alt={pack.title}
              className="w-full h-64 md:h-full object-cover"
            />
          </div>
          <div className="md:w-2/3 p-6">
            <h1 className="text-3xl font-bold mb-2">{pack.title}</h1>
            <p className="text-gray-600 mb-4">{pack.description}</p>
            <div className="flex items-center mb-4">
              <User className="w-4 h-4 mr-1" />
              <button
                onClick={() => onViewProfile(pack.author)}
                className="text-blue-600 hover:underline"
              >
                {pack.author}
              </button>
            </div>
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => handleVote('upvote')}
                className={`flex items-center space-x-1 px-3 py-1 rounded ${
                  userVote?.vote_type === 'upvote'
                    ? 'bg-green-100 text-green-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{pack.upvotes}</span>
              </button>
              <button
                onClick={() => handleVote('downvote')}
                className={`flex items-center space-x-1 px-3 py-1 rounded ${
                  userVote?.vote_type === 'downvote'
                    ? 'bg-red-100 text-red-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{pack.downvotes}</span>
              </button>
              <button
                onClick={downloadPack}
                disabled={downloadingPack}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Archive className="w-4 h-4" />
                <span>{downloadingPack ? 'Downloading...' : 'Download Pack'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Textures in this Pack ({textures.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {textures.map((texture) => (
              <div key={texture.id} className="border rounded-lg p-4">
                <img
                  src={texture.thumbnail_url}
                  alt={texture.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <h3 className="font-medium">{texture.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {texture.aircraft} - {texture.category}
                </p>
                <button
                  onClick={() => downloadTexture(texture)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Comments ({comments.length})
          </h2>
          {user && (
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add Comment
              </button>
            </div>
          )}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4">
                <div className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-1" />
                  <span className="font-medium">{comment.author_name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}