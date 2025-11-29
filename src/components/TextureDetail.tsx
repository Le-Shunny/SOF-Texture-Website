import { useState, useEffect } from 'react';
import { supabase, Texture, Comment, Vote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, processText } from '../lib/utils';
import {
  X,
  Download,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Calendar,
  User,
  Edit,
  Trash2,
  Flag,
  Hash,
} from 'lucide-react';

interface TextureDetailProps {
  texture: Texture;
  onClose: () => void;
  onEdit?: (texture: Texture) => void;
  onViewProfile?: (username: string) => void;
}

export default function TextureDetail({ texture, onClose, onEdit, onViewProfile }: TextureDetailProps) {
  const { user, profile, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [localTexture, setLocalTexture] = useState(texture);
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<'inappropriate_content' | 'theft' | 'other'>('inappropriate_content');
  const [reportReason, setReportReason] = useState('');
  const [agreeToCloudflare, setAgreeToCloudflare] = useState(false);

  useEffect(() => {
    fetchComments();
    if (user) {
      fetchUserVote();
    }
  }, [texture.id, user]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('texture_id', texture.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
    }
  };

  const fetchUserVote = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('texture_id', texture.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setUserVote(data);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    console.log('=== handleVote START ===', voteType);
    console.log('user:', user);
    if (!user) {
      console.log('No user found, showing login alert');
      alert('Please login to vote');
      return;
    }

    console.log('Starting vote operation...');

    try {
      if (userVote) {
        if (userVote.vote_type === voteType) {
          await supabase.from('votes').delete().eq('id', userVote.id);
          setUserVote(null);

          setLocalTexture({
            ...localTexture,
            upvotes: voteType === 'upvote' ? localTexture.upvotes - 1 : localTexture.upvotes,
            downvotes:
              voteType === 'downvote' ? localTexture.downvotes - 1 : localTexture.downvotes,
          });
        } else {
          await supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', userVote.id);

          setUserVote({ ...userVote, vote_type: voteType });

          setLocalTexture({
            ...localTexture,
            upvotes:
              voteType === 'upvote' ? localTexture.upvotes + 1 : localTexture.upvotes - 1,
            downvotes:
              voteType === 'downvote' ? localTexture.downvotes + 1 : localTexture.downvotes - 1,
          });
        }
      } else {
        const { data, error } = await supabase
          .from('votes')
          .insert({
            texture_id: texture.id,
            user_id: user.id,
            vote_type: voteType,
          })
          .select()
          .single();

        if (!error && data) {
          setUserVote(data);

          setLocalTexture({
            ...localTexture,
            upvotes: voteType === 'upvote' ? localTexture.upvotes + 1 : localTexture.upvotes,
            downvotes:
              voteType === 'downvote' ? localTexture.downvotes + 1 : localTexture.downvotes,
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
    if (!newComment.trim()) return;

    if (!user) {
      alert('Please login to comment');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          texture_id: texture.id,
          user_id: user.id,
          author_name: profile?.username || 'Anonymous',
          content: newComment,
        })
        .select()
        .single();

      if (!error && data) {
        setComments([data, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (!error) {
      setComments(comments.filter((c) => c.id !== commentId));
    }
  };

  const handleDeleteTexture = async () => {
    if (!confirm('Are you sure you want to delete this texture? This action cannot be undone.')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('textures').delete().eq('id', texture.id);

      if (error) throw error;

      alert('Texture deleted successfully.');
      onClose();
    } catch (error) {
      console.error('Error deleting texture:', error);
      alert('Failed to delete texture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(localTexture.texture_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${localTexture.title}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await supabase
        .from('textures')
        .update({ download_count: localTexture.download_count + 1 })
        .eq('id', localTexture.id);

      setLocalTexture({
        ...localTexture,
        download_count: localTexture.download_count + 1,
      });
    } catch (error) {
      console.error('Error downloading texture:', error);
      alert('Failed to download texture. Please try again.');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to report textures');
      return;
    }

    if (!reportReason.trim()) {
      alert('Please provide a reason for the report');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({
        texture_id: texture.id,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 overflow-y-auto">
      <div className="min-h-screen px-6 sm:px-4 py-8">
        <div className="max-w-full lg:max-w-5xl mx-auto bg-[#cbd5e1] rounded-lg shadow-xl">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">{localTexture.title}</h2>
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
                  src={localTexture.thumbnail_url}
                  alt={localTexture.title}
                  className="w-full h-full object-cover rounded-lg shadow-md"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Author</h3>
                  <p className="text-gray-800">
                    {onViewProfile ? (
                      <button
                        onClick={() => onViewProfile(localTexture.author)}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {localTexture.author}
                      </button>
                    ) : (
                      localTexture.author
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Aircraft</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                    {localTexture.aircraft}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                    {localTexture.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Type</h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                    {localTexture.texture_type}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Uploaded</h3>
                  <p className="text-gray-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(localTexture.created_at)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Updated</h3>
                  <p className="text-gray-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(localTexture.updated_at)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Downloads</h3>
                  <p className="text-gray-800 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    {formatNumber(localTexture.download_count)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Texture ID</h3>
                  <p className="text-gray-800 flex items-center gap-2 font-mono text-xs">
                    <Hash className="w-4 h-4" />
                    {localTexture.id}
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    onClick={() => {
                      console.log('Upvote button clicked');
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
                    <span>{localTexture.upvotes}</span>
                  </button>

                  <button
                    onClick={() => {
                      console.log('Downvote button clicked');
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
                    <span>{localTexture.downvotes}</span>
                  </button>
                </div>

                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Download Texture
                </button>

                {user && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition"
                  >
                    <Flag className="w-5 h-5" />
                    Report Texture
                  </button>
                )}

                {user && texture.user_id === user.id && onEdit && (
                  <button
                    onClick={() => onEdit(localTexture)}
                    className="flex items-center justify-center gap-2 w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Texture
                  </button>
                )}

                {user && texture.user_id === user.id && (
                  <button
                    onClick={handleDeleteTexture}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Texture
                  </button>
                )}
              </div>
            </div>

            {localTexture.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: processText(localTexture.description) }}></p>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
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

      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#cbd5e1] rounded-lg shadow-xl max-w-full sm:max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Report Texture</h3>
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
                  placeholder="Please describe why you are reporting this texture..."
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
    </div>
  );
}
