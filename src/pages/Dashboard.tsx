import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useMeetingStore } from '../store/meetingStore';
import { useCategories } from '../hooks/useCategories';
import { PlusCircle, Calendar, Users, FileText, Trash2, Grid, List, Search, SortAsc, SortDesc, Filter, Tag } from 'lucide-react';
import CategoryManager from '../components/categories/CategoryManager';
import toast from 'react-hot-toast';
import { Meeting } from '../types/meeting';

const postItColors = [
  'bg-yellow-100',
  'bg-green-100',
  'bg-blue-100',
  'bg-pink-100',
  'bg-purple-100',
  'bg-orange-100'
];

type ViewMode = 'grid' | 'list';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: keyof Meeting;
  direction: SortDirection;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { meetings, setMeetings, getMeetingsQuery, deleteMeeting } = useMeetingStore();
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createDate', direction: 'desc' });
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const meetingsQuery = getMeetingsQuery(user.uid);

    const unsubscribe = onSnapshot(
      meetingsQuery,
      (snapshot) => {
        const meetingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const createDate = data.createDate instanceof Timestamp ? 
            data.createDate : 
            Timestamp.now();
          const updatedAt = data.updatedAt instanceof Timestamp ? 
            data.updatedAt : 
            Timestamp.now();
            
          return {
            id: doc.id,
            ...data,
            createDate,
            updatedAt
          };
        }) as Meeting[];
        
        setMeetings(meetingsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching meetings:', error);
        toast.error('Failed to load meetings');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, setMeetings, getMeetingsQuery]);

  useEffect(() => {
    let result = [...meetings];

    if (selectedCategory) {
      result = result.filter(meeting => meeting.categoryId === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(meeting => {
        const searchableContent = [
          meeting.title,
          meeting.content,
          meeting.transcription || '',
          meeting.summary || '',
          meeting.personalNotes || '',
          ...(meeting.participants?.map(p => `${p.email} ${p.role}`) || []),
          formatDate(meeting.createDate)
        ].join(' ').toLowerCase();

        const searchWords = query.split(/\s+/);
        return searchWords.every(word => searchableContent.includes(word));
      });
    }

    result.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      if (sortConfig.field === 'createDate' || sortConfig.field === 'updatedAt') {
        const timeA = (aValue as Timestamp)?.toMillis() || 0;
        const timeB = (bValue as Timestamp)?.toMillis() || 0;
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    setFilteredMeetings(result);
  }, [meetings, searchQuery, sortConfig, selectedCategory]);

  const handleDelete = async (meeting: Meeting) => {
    setDeletingMeeting(meeting);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingMeeting) return;
    
    setIsDeleting(true);
    try {
      await deleteMeeting(deletingMeeting.id);
      toast.success('Meeting deleted successfully');
      setShowDeleteModal(false);
      setDeletingMeeting(null);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSort = (field: keyof Meeting) => {
    setSortConfig(current => ({
      field,
      direction:
        current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Date not available';
    try {
      return new Date(timestamp.toDate()).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const words = highlight.toLowerCase().split(/\s+/);
    let result = text;
    words.forEach(word => {
      if (word) {
        const regex = new RegExp(`(${word})`, 'gi');
        result = result.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
      }
    });
    return result;
  };

  const renderContent = (meeting: Meeting) => {
    const contentPreview = meeting.content || '';
    const transcriptPreview = meeting.transcription || '';
    const summaryPreview = meeting.summary || '';
    const notesPreview = meeting.personalNotes || '';
    
    let displayText = contentPreview;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const allContent = [contentPreview, transcriptPreview, summaryPreview, notesPreview].join(' ');
      const index = allContent.toLowerCase().indexOf(query);
      
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(allContent.length, index + query.length + 50);
        displayText = '...' + allContent.slice(start, end) + '...';
      }
    }

    return searchQuery ? (
      <div 
        dangerouslySetInnerHTML={{ 
          __html: getHighlightedText(displayText, searchQuery)
        }}
        className="line-clamp-3"
      />
    ) : (
      <p className="line-clamp-3">{displayText}</p>
    );
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6366F1';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Meetings</h1>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 border rounded-md flex items-center space-x-2 ${
                  showFilters || selectedCategory
                    ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => toggleSort('createDate')}
                className={`px-3 py-2 border rounded-md flex items-center space-x-2 ${
                  sortConfig.field === 'createDate'
                    ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Date</span>
                {sortConfig.field === 'createDate' && (
                  sortConfig.direction === 'desc' ? (
                    <SortDesc className="w-4 h-4" />
                  ) : (
                    <SortAsc className="w-4 h-4" />
                  )
                )}
              </button>
              <button
                onClick={() => toggleSort('title')}
                className={`px-3 py-2 border rounded-md flex items-center space-x-2 ${
                  sortConfig.field === 'title'
                    ? 'border-indigo-500 text-indigo-700 bg-indigo-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Title</span>
                {sortConfig.field === 'title' && (
                  sortConfig.direction === 'desc' ? (
                    <SortDesc className="w-4 h-4" />
                  ) : (
                    <SortAsc className="w-4 h-4" />
                  )
                )}
              </button>
              <div className="border border-gray-200 rounded-lg p-1 flex items-center bg-white shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${
                    viewMode === 'grid'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${
                    viewMode === 'list'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Tag className="w-4 h-4 mr-2" />
                Categories
              </button>
              <button
                onClick={() => navigate('/meeting/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Meeting
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  !selectedCategory
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedCategory === category.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredMeetings.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery || selectedCategory ? (
              <>
                <h3 className="text-lg font-medium text-gray-900">No matches found</h3>
                <p className="mt-1 text-gray-500">Try adjusting your filters</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900">No meetings yet</h3>
                <p className="mt-1 text-gray-500">Get started by creating a new meeting</p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMeetings.map((meeting, index) => (
              <div
                key={meeting.id}
                className={`${postItColors[index % postItColors.length]} rounded-lg transform hover:-rotate-1 transition-all duration-200 relative`}
                style={{
                  boxShadow: '2px 3px 7px rgba(0,0,0,0.1)',
                  height: '250px',
                  width: '100%'
                }}
              >
                <div 
                  className="p-6 cursor-pointer h-full flex flex-col"
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-900 line-clamp-2 flex-1 pr-8">
                      {searchQuery ? (
                        <div dangerouslySetInnerHTML={{ 
                          __html: getHighlightedText(meeting.title, searchQuery)
                        }} className="line-clamp-2" />
                      ) : (
                        meeting.title
                      )}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(meeting);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-white/50 flex-shrink-0 absolute top-4 right-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {meeting.categoryId && (
                    <div 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2"
                      style={{
                        backgroundColor: `${getCategoryColor(meeting.categoryId)}20`,
                        color: getCategoryColor(meeting.categoryId)
                      }}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {categories.find(cat => cat.id === meeting.categoryId)?.name || 'Uncategorized'}
                    </div>
                  )}

                  <div className="space-y-3 text-sm text-gray-600 flex-1 overflow-hidden">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {formatDate(meeting.createDate)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>
                        {meeting.participants?.length || 0} participants
                      </span>
                    </div>
                    <div className="flex items-start">
                      <FileText className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                      <div className="line-clamp-2 break-words">
                        {renderContent(meeting)}
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-transparent to-black/5 rounded-b-lg"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 
                            className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                            onClick={() => navigate(`/meeting/${meeting.id}`)}
                          >
                            {searchQuery ? (
                              <div dangerouslySetInnerHTML={{ 
                                __html: getHighlightedText(meeting.title, searchQuery)
                              }} />
                            ) : (
                              meeting.title
                            )}
                          </h3>
                          {meeting.categoryId && (
                            <div 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${getCategoryColor(meeting.categoryId)}20`,
                                color: getCategoryColor(meeting.categoryId)
                              }}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {categories.find(cat => cat.id === meeting.categoryId)?.name || 'Uncategorized'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(meeting)}
                          className="ml-4 p-1 text-gray-400 hover:text-red-600 rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {formatDate(meeting.createDate)}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {meeting.participants?.length || 0} participants
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {renderContent(meeting)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingMeeting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Meeting</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete "{deletingMeeting.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingMeeting(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowCategoryModal(false)} />
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
              <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
                <CategoryManager onClose={() => setShowCategoryModal(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}