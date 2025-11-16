import { useState, useEffect } from 'react';
import { supabase, Texture, Pack } from '../lib/supabase';
import { Check, X, Eye, Trash2, ChevronDown, ChevronUp, Hourglass, AlertTriangle } from 'lucide-react';
import ReportedTextures from './ReportedTextures';
import ReportedPacks from './ReportedPacks';

interface AdminPanelProps {
  onViewTexture: (texture: Texture) => void;
  onViewPack: (pack: Pack) => void;
}

export default function AdminPanel({ onViewTexture, onViewPack }: AdminPanelProps) {
  const [pendingTextures, setPendingTextures] = useState<Texture[]>([]);
  const [pendingPacks, setPendingPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSectionExpanded, setPendingSectionExpanded] = useState(true);
  const [packsSectionExpanded, setPacksSectionExpanded] = useState(true);
  const [reportsSectionExpanded, setReportsSectionExpanded] = useState(true);
  const [reportsCount, setReportsCount] = useState(0);
  const [packReportsCount, setPackReportsCount] = useState(0);

  useEffect(() => {
    fetchPendingTextures();
    fetchPendingPacks();
    fetchReportsCount();
  }, []);

  const fetchPendingTextures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('textures')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingTextures(data);
    }
    setLoading(false);
  };

  const fetchPendingPacks = async () => {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingPacks(data);
    }
  };

  const fetchReportsCount = async () => {
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      setReportsCount(count || 0);
    }

    const { count: packCount, error: packError } = await supabase
      .from('pack_reports')
      .select('*', { count: 'exact', head: true });

    if (!packError) {
      setPackReportsCount(packCount || 0);
    }
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('textures')
      .update({ status: 'approved' })
      .eq('id', id);

    if (!error) {
      setPendingTextures(pendingTextures.filter((t) => t.id !== id));
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this texture? This will delete the associated files.')) return;

    const texture = pendingTextures.find((t) => t.id === id);
    if (!texture) return;

    try {
      // Import the storage utility function
      const { deleteTextureCompletely } = await import('../lib/storageUtils');
      
      // Delete both files and database record
      await deleteTextureCompletely(id, texture.texture_url, texture.thumbnail_url);
      
      // Remove from local state
      setPendingTextures(pendingTextures.filter((t) => t.id !== id));
      
      alert('Texture rejected and files deleted successfully!');
    } catch (error) {
      console.error('Failed to reject texture:', error);
      alert('Failed to reject texture. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this texture? This will also delete the associated files.')) return;

    const texture = pendingTextures.find((t) => t.id === id);
    if (!texture) return;

    try {
      // Import the storage utility function
      const { deleteTextureCompletely } = await import('../lib/storageUtils');

      await deleteTextureCompletely(id, texture.texture_url, texture.thumbnail_url);

      // Remove from local state
      setPendingTextures(pendingTextures.filter((t) => t.id !== id));

      alert('Texture and associated files deleted successfully!');
    } catch (error) {
      console.error('Failed to delete texture:', error);
      alert('Failed to delete texture. Please try again.');
    }
  };

  const handleApprovePack = async (id: string) => {
    const { error } = await supabase
      .from('packs')
      .update({ status: 'approved' })
      .eq('id', id);

    if (!error) {
      setPendingPacks(pendingPacks.filter((p) => p.id !== id));
    }
  };

  const handleRejectPack = async (id: string) => {
    if (!confirm('Are you sure you want to reject this pack?')) return;

    const { error } = await supabase
      .from('packs')
      .delete()
      .eq('id', id);

    if (!error) {
      setPendingPacks(pendingPacks.filter((p) => p.id !== id));
      alert('Pack rejected successfully!');
    } else {
      alert('Failed to reject pack. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading pending textures...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>

      <div className="bg-[#cbd5e1] rounded-lg shadow-md">
        <button
          onClick={() => setPendingSectionExpanded(!pendingSectionExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-xl font-semibold text-gray-800">
            Pending Textures ({pendingTextures.length})
          </h2>
          {pendingSectionExpanded ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </button>

        {pendingSectionExpanded && (
          <div className="p-6 pt-0">
            {pendingTextures.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No pending textures to review.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTextures.map((texture) => (
                  <div
                    key={texture.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <div className="aspect-[3/2] w-full">
                          <img
                            src={texture.thumbnail_url}
                            alt={texture.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {texture.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">by {texture.author}</p>

                        {texture.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {texture.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {texture.aircraft}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {texture.category}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {texture.texture_type}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500">
                          Uploaded: {new Date(texture.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        <button
                          onClick={() => onViewTexture(texture)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sm:hidden">View</span>
                        </button>

                        <button
                          onClick={() => handleApprove(texture.id)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                          <span className="sm:hidden">Approve</span>
                        </button>

                        <button
                          onClick={() => handleReject(texture.id)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                          <span className="sm:hidden">Reject</span>
                        </button>

                        <button
                          onClick={() => handleDelete(texture.id)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sm:hidden">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#cbd5e1] rounded-lg shadow-md">
        <button
          onClick={() => setPacksSectionExpanded(!packsSectionExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-xl font-semibold text-gray-800">
            Pending Packs ({pendingPacks.length})
          </h2>
          {packsSectionExpanded ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </button>

        {packsSectionExpanded && (
          <div className="p-6 pt-0">
            {pendingPacks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No pending packs to review.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <div className="aspect-[3/2] w-full">
                          <img
                            src={pack.thumbnail_url}
                            alt={pack.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {pack.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">by {pack.author}</p>

                        {pack.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {pack.description}
                          </p>
                        )}

                        <p className="text-xs text-gray-500">
                          Uploaded: {new Date(pack.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        <button
                          onClick={() => onViewPack(pack)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sm:hidden">View</span>
                        </button>

                        <button
                          onClick={() => handleApprovePack(pack.id)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                          <span className="sm:hidden">Approve</span>
                        </button>

                        <button
                          onClick={() => handleRejectPack(pack.id)}
                          className="flex items-center justify-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                          <span className="sm:hidden">Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#cbd5e1] rounded-lg shadow-md">
        <button
          onClick={() => setReportsSectionExpanded(!reportsSectionExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Reported Textures ({reportsCount})
          </h2>
          {reportsSectionExpanded ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </button>

        {reportsSectionExpanded && (
          <div className="p-6 pt-0">
            <ReportedTextures onViewTexture={onViewTexture} />
          </div>
        )}
      </div>

      <div className="bg-[#cbd5e1] rounded-lg shadow-md">
        <button
          onClick={() => setReportsSectionExpanded(!reportsSectionExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Reported Packs ({packReportsCount})
          </h2>
          {reportsSectionExpanded ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </button>

        {reportsSectionExpanded && (
          <div className="p-6 pt-0">
            <ReportedPacks onViewPack={onViewPack} />
          </div>
        )}
      </div>
    </div>
  );
}
