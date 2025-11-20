import { useState, useEffect } from 'react';
import { supabase, Texture, Pack } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Download, Edit, Trash2, ThumbsUp, ThumbsDown, User, ChevronUp, ChevronDown } from 'lucide-react';

interface BrowseTexturesProps {
  onViewTexture: (texture: Texture) => void;
  onEditTexture: (texture: Texture) => void;
  onViewPack: (pack: Pack) => void;
  onEditPack: (pack: Pack) => void;
  onViewProfile: (username: string) => void;
}

type SortCategory = 'relevance' | 'upload_date' | 'update_date' | 'votes' | 'download_count';
type SortDirection = 'asc' | 'desc';


export default function BrowseTextures({ onViewTexture, onEditTexture, onViewPack, onEditPack, onViewProfile }: BrowseTexturesProps) {
  const { user, isAdmin } = useAuth();
  const [textures, setTextures] = useState<Texture[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [contentType, setContentType] = useState<'textures' | 'packs'>('textures');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAircraft, setFilterAircraft] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [sortExpanded, setSortExpanded] = useState(true);
  const [sortCategory, setSortCategory] = useState<SortCategory>('upload_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (contentType === 'textures') {
      fetchTextures();
    } else {
      fetchPacks();
    }
  }, [contentType]);

  const fetchTextures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('textures')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTextures(data);
    }
    setLoading(false);
  };

  const fetchPacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPacks(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this texture? This will also delete the associated files.')) return;

    const texture = textures.find((t) => t.id === id);
    if (!texture) return;

    if (!isAdmin && (!user || texture.user_id !== user.id)) {
      alert('You can only delete your own textures.');
      return;
    }

    try {
      // Import the storage utility function
      const { deleteTextureCompletely } = await import('../lib/storageUtils');
      
      await deleteTextureCompletely(id, texture.texture_url, texture.thumbnail_url);
      
      // Remove from local state
      setTextures(textures.filter((t) => t.id !== id));
      
      alert('Texture and associated files deleted successfully!');
    } catch (error) {
      console.error('Failed to delete texture:', error);
      alert('Failed to delete texture. Please try again.');
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pack? This will also delete the associated thumbnail.')) return;

    const pack = packs.find((p) => p.id === id);
    if (!pack) return;

    if (!isAdmin && (!user || pack.user_id !== user.id)) {
      alert('You can only delete your own packs.');
      return;
    }

    try {
      // Delete thumbnail
      const { deleteStorageFile } = await import('../lib/storageUtils');
      await deleteStorageFile(pack.thumbnail_url, 'pack-thumbnails');

      // Delete from db
      const { error } = await supabase
        .from('packs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setPacks(packs.filter((p) => p.id !== id));

      alert('Pack and thumbnail deleted successfully!');
    } catch (error) {
      console.error('Failed to delete pack:', error);
      alert('Failed to delete pack. Please try again.');
    }
  };

  const isUUIDSearch = (term: string) => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(term.trim());
  };

  const calculateRelevance = (texture: Texture, term: string): number => {
    if (!term) return 0;
    const lowerTerm = term.toLowerCase();
    let score = 0;

    if (texture.title.toLowerCase().includes(lowerTerm)) {
      score += texture.title.toLowerCase() === lowerTerm ? 100 : 50;
    }
    if (texture.author.toLowerCase().includes(lowerTerm)) score += 30;
    if (texture.aircraft.toLowerCase().includes(lowerTerm)) score += 20;
    if (texture.description.toLowerCase().includes(lowerTerm)) score += 10;

    return score;
  };

  const filteredTextures = textures.filter((texture) => {
    if (isUUIDSearch(searchTerm)) {
      return texture.id.toLowerCase() === searchTerm.trim().toLowerCase();
    }

    const matchesSearch =
      texture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      texture.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      texture.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      texture.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAircraft = filterAircraft.length === 0 || filterAircraft.includes(texture.aircraft);
    const matchesCategory = filterCategory.length === 0 || filterCategory.includes(texture.category);
    const matchesType = filterType.length === 0 || filterType.includes(texture.texture_type);

    return matchesSearch && matchesAircraft && matchesCategory && matchesType;
  });

  const sortedTextures = [...filteredTextures].sort((a, b) => {
    switch (sortCategory) {
      case 'relevance':
        return calculateRelevance(b, searchTerm) - calculateRelevance(a, searchTerm);
      case 'upload_date':
        return sortDirection === 'desc' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'update_date':
        return sortDirection === 'desc' ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() : new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case 'votes': {
        const aVotes = a.upvotes - a.downvotes;
        const bVotes = b.upvotes - b.downvotes;
        return sortDirection === 'desc' ? bVotes - aVotes : aVotes - bVotes;
      }
      case 'download_count':
        return sortDirection === 'desc' ? b.download_count - a.download_count : a.download_count - b.download_count;
      default:
        return 0;
    }
  });

  const filteredPacks = packs.filter((pack) => {
    if (isUUIDSearch(searchTerm)) {
      return pack.id.toLowerCase() === searchTerm.trim().toLowerCase();
    }

    const matchesSearch =
      pack.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pack.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pack.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pack.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const sortedPacks = [...filteredPacks].sort((a, b) => {
    switch (sortCategory) {
      case 'relevance':
        return calculatePackRelevance(b, searchTerm) - calculatePackRelevance(a, searchTerm);
      case 'upload_date':
        return sortDirection === 'desc' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'update_date':
        return sortDirection === 'desc' ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() : new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case 'votes': {
        const aVotes = a.upvotes - a.downvotes;
        const bVotes = b.upvotes - b.downvotes;
        return sortDirection === 'desc' ? bVotes - aVotes : aVotes - bVotes;
      }
      case 'download_count':
        // Packs don't have download_count, sort by upvotes instead
        return sortDirection === 'desc' ? b.upvotes - a.upvotes : a.upvotes - b.upvotes;
      default:
        return 0;
    }
  });

  const calculatePackRelevance = (pack: Pack, term: string): number => {
    if (!term) return 0;
    const lowerTerm = term.toLowerCase();
    let score = 0;

    if (pack.title.toLowerCase().includes(lowerTerm)) {
      score += pack.title.toLowerCase() === lowerTerm ? 100 : 50;
    }
    if (pack.author.toLowerCase().includes(lowerTerm)) score += 30;
    if (pack.description.toLowerCase().includes(lowerTerm)) score += 10;

    return score;
  };

  const aircraftOptions = Array.from(new Set(textures.map((t) => t.aircraft))).sort();
  const categoryOptions = Array.from(new Set(textures.map((t) => t.category))).sort();
  const typeOptions = Array.from(new Set(textures.map((t) => t.texture_type))).sort();

  const toggleFilter = (value: string, currentFilters: string[], setFilters: (filters: string[]) => void) => {
    if (currentFilters.includes(value)) {
      setFilters(currentFilters.filter(f => f !== value));
    } else {
      setFilters([...currentFilters, value]);
    }
  };

  const clearAllFilters = () => {
    setFilterAircraft([]);
    setFilterCategory([]);
    setFilterType([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading {contentType}...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Browse {contentType === 'textures' ? 'Textures' : 'Packs'}</h1>

        <div className="bg-[#cbd5e1] rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <div className="flex mb-4">
              <button
                onClick={() => setContentType('textures')}
                className={`px-4 py-2 rounded-l-md ${
                  contentType === 'textures'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Textures
              </button>
              <button
                onClick={() => setContentType('packs')}
                className={`px-4 py-2 rounded-r-md ${
                  contentType === 'packs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Packs
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, author, #tags or UUID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <button
                  onClick={() => setSortExpanded(!sortExpanded)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <span>Sort</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${sortExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sortExpanded && (
                  <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSortCategory('relevance')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      sortCategory === 'relevance'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Relevance
                  </button>
                  <button
                    onClick={() => setSortCategory('upload_date')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      sortCategory === 'upload_date'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Upload Date
                  </button>
                  <button
                    onClick={() => setSortCategory('update_date')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      sortCategory === 'update_date'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Update Date
                  </button>
                  <button
                    onClick={() => setSortCategory('votes')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      sortCategory === 'votes'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Votes
                  </button>
                  <button
                    onClick={() => setSortCategory('download_count')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      sortCategory === 'download_count'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Download Count
                  </button>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                  >
                    {sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    {sortDirection === 'desc' ? 'High to Low' : 'Low to High'}
                  </button>
                </div>
                )}
              </div>
              {contentType === 'textures' && (
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="ml-4 flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <span>Filters</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) }
            </div>
          </div>

          {filtersExpanded && contentType === 'textures' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Aircraft</label>
                    {filterAircraft.length > 0 && (
                      <button
                        onClick={() => setFilterAircraft([])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Clear
                      </button>
                    ) }
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                    {aircraftOptions.map((aircraft) => (
                      <label key={aircraft} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterAircraft.includes(aircraft)}
                          onChange={() => toggleFilter(aircraft, filterAircraft, setFilterAircraft)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{aircraft}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    {filterCategory.length > 0 && (
                      <button
                        onClick={() => setFilterCategory([])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Clear
                      </button>
                    ) }
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                    {categoryOptions.map((category) => (
                      <label key={category} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterCategory.includes(category)}
                          onChange={() => toggleFilter(category, filterCategory, setFilterCategory)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    {filterType.length > 0 && (
                      <button
                        onClick={() => setFilterType([])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Clear
                      </button>
                    ) }
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                    {typeOptions.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterType.includes(type)}
                          onChange={() => toggleFilter(type, filterType, setFilterType)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              {(filterAircraft.length > 0 || filterCategory.length > 0 || filterType.length > 0) && (
                <div className="flex justify-end">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) }
            </div>
          ) }
        </div>
      </div>

      {(contentType === 'textures' ? sortedTextures : sortedPacks).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {contentType} found. Try adjusting your filters or search terms.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {contentType === 'textures' && sortedTextures.map((texture) => (
            <div
              key={texture.id}
              className="bg-[#cbd5e1] rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
              onClick={() => onViewTexture(texture)}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-52 flex-shrink-0 p-4">
                  <div className="aspect-[3/2] w-full">
                    <img
                      src={texture.thumbnail_url}
                      alt={texture.title}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{texture.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{texture.description}</p>
                      <div className="flex items-center mt-2">
                        <User className="w-4 h-4 mr-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile(texture.author);
                          }}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {texture.author}
                        </button>
                      </div>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <span>{texture.aircraft}</span>
                        <span className="mx-2">•</span>
                        <span>{texture.category}</span>
                        <span className="mx-2">•</span>
                        <span>{texture.texture_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">{texture.upvotes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600">{texture.downvotes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Download className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-600">{texture.download_count}</span>
                      </div>
                    </div>
                  </div>

                  {(isAdmin || (user && texture.user_id === user.id)) && (
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      {user && texture.user_id === user.id && (
                        <button
                          onClick={() => onEditTexture(texture)}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(texture.id)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  ) }
                </div>
              </div>
            </div>
          )) }
          {contentType === 'packs' && sortedPacks.map((pack) => (
            <div
              key={pack.id}
              className="bg-[#cbd5e1] rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
              onClick={() => onViewPack(pack)}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-52 flex-shrink-0 p-4">
                  <div className="aspect-[3/2] w-full">
                    <img
                      src={pack.thumbnail_url}
                      alt={pack.title}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{pack.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pack.description}</p>
                      <div className="flex items-center mt-2">
                        <User className="w-4 h-4 mr-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile(pack.author);
                          }}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {pack.author}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">{pack.upvotes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600">{pack.downvotes}</span>
                      </div>
                    </div>
                  </div>

                  {(isAdmin || (user && pack.user_id === user.id)) && (
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      {user && pack.user_id === user.id && (
                        <button
                          onClick={() => onEditPack(pack)}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePack(pack.id)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
