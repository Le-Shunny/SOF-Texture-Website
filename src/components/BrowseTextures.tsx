import { useState, useEffect, useRef } from 'react';
import { supabase, Texture, Pack } from '../lib/supabase';
import { getCache, setCache, clearCache, updateCacheEntry, mergeRealtimeChange } from '../lib/cache';
import { useAuth } from '../contexts/AuthContext';
import { processText } from '../lib/utils';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
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
  const [currentPageTextures, setCurrentPageTextures] = useState(0);
  const [currentPagePacks, setCurrentPagePacks] = useState(0);
  const [hasMoreTextures, setHasMoreTextures] = useState(true);
  const [hasMorePacks, setHasMorePacks] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAircraft, setFilterAircraft] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [sortExpanded, setSortExpanded] = useState(true);
  const [sortCategory, setSortCategory] = useState<SortCategory>('upload_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  // Fetch all approved values for filter options so filters include values not on the current page
  const [fetchedAircraftOptions, setFetchedAircraftOptions] = useState<string[]>([]);
  const [fetchedCategoryOptions, setFetchedCategoryOptions] = useState<string[]>([]);
  const [fetchedTypeOptions, setFetchedTypeOptions] = useState<string[]>([]);
  const [allTextures, setAllTextures] = useState<Texture[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [preloadLoading, setPreloadLoading] = useState(false);
  const [preloadLoaded, setPreloadLoaded] = useState(0);
  const [preloadTotal, setPreloadTotal] = useState<number | null>(null);
  const preloadAbortRef = useRef({ aborted: false });

  // Real-time subscriptions for textures
  useRealtimeSubscription<Texture>({
    table: 'textures',
    filter: 'status=eq.approved',
    onInsert: (payload) => {
      if (payload.new) {
        setAllTextures(prev => prev ? mergeRealtimeChange(prev, 'INSERT', payload.new as Texture) : null);
        updateCacheEntry('all_textures', (current) => mergeRealtimeChange(current, 'INSERT', payload.new as Texture));
      }
    },
    onUpdate: (payload) => {
      if (payload.new) {
        setAllTextures(prev => prev ? mergeRealtimeChange(prev, 'UPDATE', payload.new as Texture) : null);
        updateCacheEntry('all_textures', (current) => mergeRealtimeChange(current, 'UPDATE', payload.new as Texture));
      }
    },
    onDelete: (payload) => {
      if (payload.old) {
        setAllTextures(prev => prev ? mergeRealtimeChange(prev, 'DELETE', undefined, payload.old as Texture) : null);
        updateCacheEntry('all_textures', (current) => mergeRealtimeChange(current, 'DELETE', undefined, payload.old as Texture));
      }
    },
    onError: (error) => console.error('Texture subscription error:', error),
  });

  // Real-time subscriptions for packs
  useRealtimeSubscription<Pack>({
    table: 'packs',
    filter: 'status=eq.approved',
    onInsert: (payload) => {
      if (payload.new) {
        setPacks(prev => mergeRealtimeChange(prev, 'INSERT', payload.new as Pack) as Pack[]);
      }
    },
    onUpdate: (payload) => {
      if (payload.new) {
        setPacks(prev => mergeRealtimeChange(prev, 'UPDATE', payload.new as Pack) as Pack[]);
      }
    },
    onDelete: (payload) => {
      console.log('Pack delete payload:', payload);
      if (payload.old) {
        setPacks(prev => mergeRealtimeChange(prev, 'DELETE', undefined, payload.old as Pack) as Pack[]);
      }
    },
    onError: (error) => console.error('Pack subscription error:', error),
  });

  const fetchTextures = async (page: number = 0, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('textures')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      if (append) {
        setTextures(prev => [...prev, ...data]);
        setHasMoreTextures(data.length === pageSize);
      } else {
        setTextures(data);
        setHasMoreTextures(data.length === pageSize);
      }
    }
    if (append) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  };

  const fetchPacks = async (page: number = 0, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      if (append) {
        setPacks(prev => [...prev, ...data]);
        setHasMorePacks(data.length === pageSize);
      } else {
        setPacks(data);
        setHasMorePacks(data.length === pageSize);
      }
    }
    if (append) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    setFilterLoading(true);
    try {
      // Try RPC-based query first (returns JSONB with arrays) - more efficient at scale
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('get_texture_filter_options');
        if (!rpcErr && rpcRes) {
          const payload = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
          const aircrafts: string[] = payload?.aircrafts ?? [];
          const categories: string[] = payload?.categories ?? [];
          const texture_types: string[] = payload?.texture_types ?? [];

          setFetchedAircraftOptions(aircrafts);
          setFetchedCategoryOptions(categories);
          setFetchedTypeOptions(texture_types);
          setFilterLoading(false);
          return;
        }
      } catch (rpcErr) {
        // RPC not available, will fall back
        console.warn('get_texture_filter_options RPC failed, falling back to full scan', rpcErr);
      }

      // Fallback: fetch fields and compute distinct client-side
      // Grab only the relevant fields to reduce data size
      const { data, error } = await supabase
        .from('textures')
        .select('aircraft, category, texture_type')
        .eq('status', 'approved');

      if (error) {
        console.error('Failed to fetch filter options:', error);
        setFilterLoading(false);
        return;
      }

      if (data) {
        const aircraftSet = new Set<string>();
        const categorySet = new Set<string>();
        const typeSet = new Set<string>();

        data.forEach((row: Pick<Texture, 'aircraft' | 'category' | 'texture_type'>) => {
          if (row?.aircraft) aircraftSet.add(row.aircraft);
          if (row?.category) categorySet.add(row.category);
          if (row?.texture_type) typeSet.add(row.texture_type);
        });

        setFetchedAircraftOptions(Array.from(aircraftSet).sort());
        setFetchedCategoryOptions(Array.from(categorySet).sort());
        setFetchedTypeOptions(Array.from(typeSet).sort());
      }
    } catch (err) {
      console.error('Error fetching filter options', err);
    } finally {
      setFilterLoading(false);
    }
  };

  // Preload all approved textures (in background) so filtering/searching is fast
  const fetchAllTextures = async () => {
    try {
      // Reset abort flag
      preloadAbortRef.current.aborted = false;
      // Check cache first
      let cachedTextures: Texture[] = [];
      const cache = await getCache<Texture[]>('all_textures');
      if (cache && cache.value && cache.value.length > 0) {
        cachedTextures = cache.value;
        setAllTextures(cachedTextures);
        setPreloadLoaded(cachedTextures.length);
        setPreloadTotal(cachedTextures.length);
        // otherwise, continue to refresh in background while showing cached
      }
      if (allTextures && allTextures.length > 0) return; // already loaded
      setPreloadLoading(true);
      if (cachedTextures.length === 0) {
        setPreloadLoaded(0);
        setPreloadTotal(null);
      }
      // Get total count first for progress
      const countRes = await supabase.from('textures').select('id', { count: 'exact', head: true }).eq('status', 'approved');
      const total = countRes.count ?? null;
      if (total !== null) setPreloadTotal(total);

      const batchSize = 500; // chunk size
      let offset = 0;
      let combined: Texture[] = [];
      while (true) {
        if (preloadAbortRef.current.aborted) break;
        const from = offset;
        const to = offset + batchSize - 1;
        const { data, error } = await supabase
          .from('textures')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) {
          console.error('Failed to fetch texture batch:', error);
          break;
        }
        if (!data || data.length === 0) break;

        combined = [...combined, ...data];
        offset += data.length;
        if (data.length < batchSize) break;
      }
      
      // Merge with cached textures, prioritizing new data (by deduplicating on ID)
      const idSet = new Set(combined.map(t => t.id));
      const mergedTextures = [...combined, ...cachedTextures.filter(t => !idSet.has(t.id))];
      
      // Set all textures at once to avoid duplicates
      setAllTextures(mergedTextures);
      setPreloadLoaded(mergedTextures.length);
      setPreloadTotal(mergedTextures.length);
      setHasMoreTextures(mergedTextures.length > pageSize);
      // Save merged cache if we completed without abort
      if (!preloadAbortRef.current.aborted) {
        try {
          await setCache('all_textures', mergedTextures);
        } catch (err) {
          console.warn('Failed to cache all_textures', err);
        }
      }
    } catch (err) {
      console.error('Error preloading textures', err);
    } finally {
      setPreloadLoading(false);
    }
  };

  const cancelPreload = () => {
    preloadAbortRef.current.aborted = true;
    setPreloadLoading(false);
  };


  const handleClearCache = async () => {
    try {
      await clearCache('all_textures');
      setAllTextures(null);
      setPreloadLoaded(0);
      setPreloadTotal(null);
      // Reset visible list and reload first page
      setTextures([]);
      fetchTextures(0, false);
      fetchFilterOptions();
      // Optionally re-run preload
    } catch (err) {
      console.warn('Failed to clear cache', err);
    }
  };

  const loadMore = () => {
    if (contentType === 'textures') {
      if (hasMoreTextures && !loadingMore) {
        const nextPage = currentPageTextures + 1;
        setCurrentPageTextures(nextPage);
        // If we preloaded all textures, we don't need to fetch more pages from the server
        if (!allTextures) {
          fetchTextures(nextPage, true);
        }
      }
    } else {
      if (hasMorePacks && !loadingMore) {
        const nextPage = currentPagePacks + 1;
        setCurrentPagePacks(nextPage);
        fetchPacks(nextPage, true);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this texture? This will also delete the associated files.')) return;

    // Find texture in either allTextures (if preloaded) or current page textures
    const texture = (allTextures || textures).find((t) => t.id === id);
    
    if (!texture) {
      console.error('Texture not found for deletion:', id);
      return;
    }

    if (!isAdmin && (!user || texture.user_id !== user.id)) {
      alert('You can only delete your own textures.');
      return;
    }

    try {
      // Import the storage utility function
      const { deleteTextureCompletely } = await import('../lib/storageUtils');
      
      await deleteTextureCompletely(id, texture.texture_url, texture.thumbnail_url);
      
      // Remove from local state
      setTextures(prev => prev.filter((t) => t.id !== id));
      // Remove from preloaded set if present
      setAllTextures(prev => prev ? prev.filter((t) => t.id !== id) : null);
      // Refresh filter options (in case the deleted texture changed available filters)
      fetchFilterOptions();
      
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
      // Refresh filter options too (for packs there are no texture filters, but keep symmetry)
      fetchFilterOptions();

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

  const baseTextures = allTextures ?? textures;

  const filteredTextures = baseTextures.filter((texture) => {
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

    // Visible textures for UI (limit items by page)
    const visibleTextures = sortedTextures.slice(0, (currentPageTextures + 1) * pageSize);

  const aircraftOptions = Array.from(new Set(baseTextures.map((t) => t.aircraft))).sort();
  const categoryOptions = Array.from(new Set(baseTextures.map((t) => t.category))).sort();
  const typeOptions = Array.from(new Set(baseTextures.map((t) => t.texture_type))).sort();
  // Prefer fetched options (from the server) which include values not present in the currently loaded page
  const displayAircraftOptions = fetchedAircraftOptions.length > 0 ? fetchedAircraftOptions : aircraftOptions;
  const displayCategoryOptions = fetchedCategoryOptions.length > 0 ? fetchedCategoryOptions : categoryOptions;
  const displayTypeOptions = fetchedTypeOptions.length > 0 ? fetchedTypeOptions : typeOptions;

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

  // Reset to first page when filters/search/sort change, so user sees relevant items immediately
  useEffect(() => {
    setCurrentPageTextures(0);
  }, [searchTerm, filterAircraft, filterCategory, filterType, sortCategory, sortDirection]);

  useEffect(() => {
    // Reset pages when contentType changes
    setCurrentPageTextures(0);
    setCurrentPagePacks(0);
    setTextures([]);
    setPacks([]);
    setHasMoreTextures(true);
    setHasMorePacks(true);

    if (contentType === 'textures') {
      setLoading(true);
      // Fetch filter options independently so the checkboxes include values from all approved textures
      fetchFilterOptions();
      // Start preloading everything in the background so filtering/search becomes instant
      fetchAllTextures();
      // Set loading to false once we have cached data or after a short delay
      setTimeout(() => setLoading(false), 100);
    } else {
      fetchPacks(0, false);
    }
  }, [contentType]);

  // On mount, preload filters and all textures so the first visit is fast
  useEffect(() => {
    // Run both in the background; do not block rendering
    setLoading(true);
    fetchFilterOptions();
    fetchAllTextures();
    // Clear loading state after initial setup
    setTimeout(() => setLoading(false), 100);
  }, []);

  // Real-time subscriptions replace the need for periodic refresh

  // Update hasMoreTextures when the base dataset or page changes
  useEffect(() => {
    const total = filteredTextures.length;
    setHasMoreTextures(total > (currentPageTextures + 1) * pageSize);
  }, [filteredTextures, currentPageTextures]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentType, hasMoreTextures, hasMorePacks, loadingMore, currentPageTextures, currentPagePacks]);

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
                {preloadLoading && (
                  <div className="text-sm text-gray-500 ml-3 flex items-center gap-2">
                    <span>Preloading {preloadLoaded}{preloadTotal ? `/${preloadTotal}` : ''}</span>
                    <button
                      onClick={cancelPreload}
                      className="text-xs text-gray-700 bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                    >
                      Stop
                    </button>
                    <button
                      onClick={handleClearCache}
                      className="text-xs text-gray-700 bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                    >
                      Clear Cache
                    </button>
                  </div>
                )}
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
                      { (sortCategory === 'upload_date' || sortCategory === 'update_date') ? (sortDirection === 'desc' ? 'Newest' : 'Oldest') : (sortDirection === 'desc' ? 'High to Low' : 'Low to High') }
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
                  {filterLoading && <span className="text-xs text-gray-500">Loading...</span>}
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

          {/* Preload progress bar */}
          {preloadLoading && (
            <div className="h-1 bg-gray-200 rounded-b overflow-hidden">
              {preloadTotal ? (
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${Math.min(100, Math.round((preloadLoaded / (preloadTotal || 1)) * 100))}%` }}
                />
              ) : (
                <div className="h-full bg-blue-600 animate-pulse" style={{ width: '40%' }} />
              )}
            </div>
          )}

          {filtersExpanded && contentType === 'textures' && (
            <div className="p-4 space-y-4">
              {filterLoading && (
                <div className="text-sm text-gray-500">Loading filter options...</div>
              )}
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
                    {displayAircraftOptions.map((aircraft) => (
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
                    {displayCategoryOptions.map((category) => (
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
                    {displayTypeOptions.map((type) => (
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
          {loadingMore && (
            <div className="text-center py-4">
              <div className="text-gray-500">Loading more...</div>
            </div>
          )}
          {contentType === 'textures' && visibleTextures.map((texture) => (
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
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
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
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: processText(pack.description) }}></p>
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
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
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
