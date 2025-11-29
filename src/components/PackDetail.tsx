import { useState, useEffect } from 'react';
import { supabase, Pack, PackComment, PackVote, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Download, ThumbsUp, ThumbsDown, MessageSquare, User, Package, Archive, X, Edit, Calendar, Hash, Trash2, Flag } from 'lucide-react';
import JSZip from 'jszip';
import EditPack from './EditPack';
import TextureDetail from './TextureDetail';
import { deleteStorageFile } from '../lib/storageUtils';
import { processText } from '../lib/utils';

interface PackDetailProps {
  pack: Pack;
  onClose: () => void;
  onViewProfile: (username: string) => void;
  onViewTexture: (texture: Texture) => void;
}

export default function PackDetail({ pack, onClose, onViewProfile, onViewTexture }: PackDetailProps) {
  const { user, isAdmin } = useAuth();
  const [textures, setTextures] = useState<Texture[]>([]);
  const [comments, setComments] = useState<PackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userVote, setUserVote] = useState<PackVote | null>(null);
  const [localPack, setLocalPack] = useState(pack);
  const [loading, setLoading] = useState(true);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<'inappropriate_content' | 'theft' | 'other'>('inappropriate_content');
  const [reportReason, setReportReason] = useState('');
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [agreeToCloudflare, setAgreeToCloudflare] = useState(false);

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
      .order('created_at', { ascending: false });

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
    console.log('Pack handleVote called with:', voteType, 'user:', user);
    if (!user) {
      console.log('Pack: No user found, showing login alert');
      alert('Please login to vote');
      return;
    }

    console.log('Starting pack vote operation...');

    try {
      if (userVote) {
        if (userVote.vote_type === voteType) {
          await supabase.from('pack_votes').delete().eq('id', userVote.id);
          setUserVote(null);

          setLocalPack({
            ...localPack,
            upvotes: voteType === 'upvote' ? localPack.upvotes - 1 : localPack.upvotes,
            downvotes:
              voteType === 'downvote' ? localPack.downvotes - 1 : localPack.downvotes,
          });
        } else {
          await supabase
            .from('pack_votes')
            .update({ vote_type: voteType })
            .eq('id', userVote.id);

          setUserVote({ ...userVote, vote_type: voteType });

          setLocalPack({
            ...localPack,
            upvotes:
              voteType === 'upvote' ? localPack.upvotes + 1 : localPack.upvotes - 1,
            downvotes:
              voteType === 'downvote' ? localPack.downvotes + 1 : localPack.downvotes - 1,
          });
        }
      } else {
        const { data, error } = await supabase
          .from('pack_votes')
          .insert({
            pack_id: pack.id,
            user_id: user.id,
            vote_type: voteType,
          })
          .select()
          .single();

        if (!error && data) {
          setUserVote(data);

          setLocalPack({
            ...localPack,
            upvotes: voteType === 'upvote' ? localPack.upvotes + 1 : localPack.upvotes,
            downvotes:
              voteType === 'downvote' ? localPack.downvotes + 1 : localPack.downvotes,
          });
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic update on error
      // Note: This is complex to implement properly, so for now we keep the optimistic update
      // In a production app, you might want to revert the local state on error
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const { error } = await supabase.from('pack_comments').delete().eq('id', commentId);

    if (!error) {
      setComments(comments.filter((c) => c.id !== commentId));
    }
  };

  const handleEditPack = () => {
    setIsEditing(true);
  };

  const handleDeletePack = async () => {
    if (!confirm('Are you sure you want to delete this pack?')) return;

    setLoading(true);

    try {
      // Delete the thumbnail file
      await deleteStorageFile(localPack.thumbnail_url, 'pack-thumbnails');

      // Delete the pack from database (cascade will handle related records)
      const { error } = await supabase
        .from('packs')
        .delete()
        .eq('id', localPack.id);

      if (error) throw error;

      alert('Pack and associated thumbnail deleted successfully!');
      onClose(); // Close the detail view
    } catch (error) {
      console.error('Failed to delete pack:', error);
      alert('Failed to delete pack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePack = (updatedPack: Pack) => {
    setLocalPack(updatedPack);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to report packs');
      return;
    }

    if (!reportReason.trim()) {
      alert('Please provide a reason for the report');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pack_reports').insert({
        pack_id: pack.id,
        reporter_id: user.id,
        category: reportCategory,
        reason: reportReason,
      });

      if (error) throw error;

      alert('Report submitted successfully. Thank you for helping keep our community safe!');
      setShowReportModal(false);
      setReportReason('');
      setReportCategory('inappropriate_content');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTexture = async (texture: Texture) => {
    try {
      const response = await fetch(texture.texture_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${texture.title}.png`;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading pack details...</div>;
  }

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-60 overflow-y-auto">
        <div className="min-h-screen px-6 sm:px-4 py-8">
          <div className="max-w-full lg:max-w-5xl mx-auto bg-white rounded-lg shadow-xl">
            <EditPack
              pack={localPack}
              onUpdate={handleUpdatePack}
              onClose={handleCloseEdit}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-60 overflow-y-auto">
        <div className="min-h-screen px-6 sm:px-4 py-8">
          <div className="max-w-full lg:max-w-5xl mx-auto bg-[#cbd5e1] rounded-lg shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">{localPack.title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="aspect-[3/2]">
                  <img
                    src={localPack.thumbnail_url}
                    alt={localPack.title}
                    className="w-full h-full object-cover rounded-lg shadow-md"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Author</h3>
                    <p className="text-gray-800">
                      {onViewProfile ? (
                        <button
                          onClick={() => onViewProfile(localPack.author)}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {localPack.author}
                        </button>
                      ) : (
                        localPack.author
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Uploaded</h3>
                    <p className="text-gray-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(localPack.created_at)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Updated</h3>
                    <p className="text-gray-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(localPack.updated_at)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Pack ID</h3>
                    <p className="text-gray-800 flex items-center gap-2 font-mono text-xs">
                      <Hash className="w-4 h-4" />
                      {localPack.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={() => {
                        console.log('Pack upvote button clicked');
                        handleVote('upvote');
                      }}
                      disabled={false}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                        userVote?.vote_type === 'upvote'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-green-50'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      <span>{localPack.upvotes}</span>
                    </button>

                    <button
                      onClick={() => {
                        console.log('Pack downvote button clicked');
                        handleVote('downvote');
                      }}
                      disabled={false}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                        userVote?.vote_type === 'downvote'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-50'
                      }`}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      <span>{localPack.downvotes}</span>
                    </button>
                  </div>

                  <button
                    onClick={downloadPack}
                    disabled={downloadingPack}
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition"
                  >
                    <Archive className="w-5 h-5" />
                    {downloadingPack ? 'Downloading...' : 'Download Pack'}
                  </button>

                  {user && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition"
                    >
                      <Flag className="w-5 h-5" />
                      Report Pack
                    </button>
                  )}

                  {user && user.id === localPack.user_id && (
                    <>
                      <button
                        onClick={handleEditPack}
                        className="flex items-center justify-center gap-2 w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700"
                      >
                        <Edit className="w-5 h-5" />
                        Edit Pack
                      </button>
                      <button
                        onClick={handleDeletePack}
                        className="flex items-center justify-center gap-2 w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Pack
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Textures in this Pack ({textures.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {textures.map((texture) => (
                    <div key={texture.id} className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition" onClick={() => setSelectedTexture(texture)}>
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
                        onClick={(e) => { e.stopPropagation(); downloadTexture(texture); }}
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comments ({comments.length})
                </h3>

                {user && (
                  <form onSubmit={handleAddComment} className="mb-6">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      rows={3}
                    />
                    <button
                      type="submit"
                      disabled={loading || !newComment.trim()}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      Post Comment
                    </button>
                  </form>
                )}

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-800">
                            {comment.author_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>

                        {(user?.id === comment.user_id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: processText(comment.content) }}></p>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#cbd5e1] rounded-lg shadow-xl max-w-full sm:max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Report Pack</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as 'inappropriate_content' | 'theft' | 'other')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="theft">Stolen/Plagiarized Content</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please describe why you are reporting this pack..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTexture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] overflow-y-auto">
          <TextureDetail
            texture={selectedTexture}
            onClose={() => setSelectedTexture(null)}
            onViewProfile={onViewProfile}
          />
        </div>
      )}
    </>
  );
}
