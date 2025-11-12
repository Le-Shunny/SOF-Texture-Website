import { useState, useEffect } from 'react';
import { supabase, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Download, Edit, Trash2, ThumbsUp, ThumbsDown, ArrowUpDown } from 'lucide-react';

interface BrowseTexturesProps {
  onViewTexture: (texture: Texture) => void;
}

type SortOption = 'relevance' | 'newest' | 'oldest' | 'updated_newest' | 'updated_oldest' | 'upvotes_high' | 'downvotes_high' | 'downloads_high' | 'downloads_low';

export default function BrowseTextures({ onViewTexture }: BrowseTexturesProps) {
  const { isAdmin } = useAuth();
  const [textures, setTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAircraft, setFilterAircraft] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    fetchTextures();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this texture? This will also delete the associated files.')) return;

    const texture = textures.find((t) => t.id === id);
    if (!texture) return;

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
    switch (sortBy) {
      case 'relevance':
        return calculateRelevance(b, searchTerm) - calculateRelevance(a, searchTerm);
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'updated_newest':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case 'updated_oldest':
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case 'upvotes_high':
        return b.upvotes - a.upvotes;
      case 'downvotes_high':
        return b.downvotes - a.downvotes;
      case 'downloads_high':
        return b.download_count - a.download_count;
      case 'downloads_low':
        return a.download_count - b.download_count;
      default:
        return 0;
    }
  });

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
        <div className="text-gray-500">Loading textures...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Browse Textures</h1>

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, author, aircraft, or UUID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="updated_newest">Recently Updated</option>
                  <option value="updated_oldest">Least Recently Updated</option>
                  <option value="upvotes_high">Most Upvoted</option>
                  <option value="downvotes_high">Most Downvoted</option>
                  <option value="downloads_high">Most Downloaded</option>
                  <option value="downloads_low">Least Downloaded</option>
                </select>
              </div>
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
            </div>
          </div>

          {filtersExpanded && (
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
                    )}
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
                    )}
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
                    )}
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
              )}
            </div>
          )}
        </div>
      </div>

      {sortedTextures.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No textures found. Try adjusting your filters or search terms.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTextures.map((texture) => (
            <div
              key={texture.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
              onClick={() => onViewTexture(texture)}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-48 flex-shrink-0 p-4">
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
                      <h3 className="font-semibold text-gray-800 text-lg mb-1">{texture.title}</h3>
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
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          {texture.texture_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{texture.upvotes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsDown className="w-4 h-4" />
                          <span>{texture.downvotes}</span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(texture.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
