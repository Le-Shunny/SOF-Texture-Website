import { useState, useEffect } from 'react';
import { supabase, Texture, Report } from '../lib/supabase';
import { Eye, XCircle, AlertTriangle, Trash2, Grid3X3, List } from 'lucide-react';

interface ReportWithTexture extends Report {
  texture: Texture | null;
  reporter_email: string | null;
}

interface ReportedTexturesProps {
  onViewTexture: (texture: Texture) => void;
}

export default function ReportedTextures({ onViewTexture }: ReportedTexturesProps) {
  const [reports, setReports] = useState<ReportWithTexture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase
        .from('reports')
        .select('*, texture:textures(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsWithEmails = await Promise.all(
        (reportsData || []).map(async (report) => {
          let reporterName = null;
          if (report.reporter_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', report.reporter_id)
              .single();
            reporterName = profileData?.username || null;
          }
          return {
            ...report,
            texture: report.texture,
            reporter_email: reporterName,
          };
        })
      );

      setReports(reportsWithEmails);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to dismiss this report?')) return;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      console.error('Error dismissing report:', error);
      alert('Failed to dismiss report');
    }
  };

  const handleDismissAllReports = async () => {
    if (!confirm('Are you sure you want to dismiss all reports?')) return;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setReports([]);
    } catch (error) {
      console.error('Error dismissing all reports:', error);
      alert('Failed to dismiss all reports');
    }
  };
  const handleDeleteTexture = async (reportId: string, texture: Texture) => {
    if (!confirm('Are you sure you want to delete this texture and all its reports? This will also delete the associated files.')) return;

    try {
      // Import the storage utility function
      const { deleteTextureCompletely } = await import('../lib/storageUtils');

      // Delete the texture completely (files + database record)
      await deleteTextureCompletely(texture.id, texture.texture_url, texture.thumbnail_url);

      // Remove all reports for this texture from local state
      setReports(reports.filter(r => r.texture_id !== texture.id));

      alert('Texture and all associated reports deleted successfully!');
    } catch (error) {
      console.error('Error deleting texture:', error);
      alert('Failed to delete texture. Please try again.');
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'inappropriate_content':
        return 'Inappropriate Content';
      case 'theft':
        return 'Stolen/Plagiarized';
      case 'other':
        return 'Other';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  const filteredReports = reports.filter(report =>
    report.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
        </h2>
        {reports.length > 0 && (
          <button
            onClick={handleDismissAllReports}
            className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
            title="Dismiss All Reports"
          >
            <XCircle className="w-4 h-4" />
            Dismiss All
          </button>
        )}
      </div>

      {reports.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-400 hover:text-gray-600 transition"
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
            </button>
            <input
              type="text"
              placeholder="Search by Report UUID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No reports found.
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {report.texture && (
                  <div className="w-full md:w-48 flex-shrink-0">
                    <div className="aspect-[3/2] w-full">
                      <img
                        src={report.texture.thumbnail_url}
                        alt={report.texture.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {report.texture && (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {report.texture.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        by {report.texture.author}
                      </p>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Category:</span>
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                        {getCategoryLabel(report.category)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Reporter:</span>
                      <span className="ml-2 text-xs text-gray-700">
                        {report.reporter_email || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">ID:</span>
                      <span className="ml-2 text-xs text-gray-700">
                        {report.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Reported:</span>
                      <span className="ml-2 text-xs text-gray-700">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Reason:</p>
                    <p className="text-sm text-gray-700">{report.reason}</p>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  {report.texture && (
                    <button
                      onClick={() => onViewTexture(report.texture!)}
                      className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                      title="View Texture"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="md:hidden">View</span>
                    </button>
                  )}

                  {report.texture && (
                    <button
                      onClick={() => handleDeleteTexture(report.id, report.texture!)}
                      className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition"
                      title="Delete Texture & Reports"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="md:hidden">Delete Content</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
                    title="Dismiss Report"
                  >
                    <XCircle className="w-4 h-4" />
                    <span className="md:hidden">Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}