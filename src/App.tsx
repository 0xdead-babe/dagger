import { useState } from 'react';
import TagList from '@/components/TagList';
import TagForm from '@/components/TagForm';
import BookmarkForm from '@/components/BookmarkForm';
import BookmarkList from '@/components/BookmarkList';
import ImportExport from '@/components/ImportExport';
import Modal from '@/components/Modal'; // Import the new Modal component
import TagFilterModal from '@/components/TagFilterModal'; // Import TagFilterModal
import { LayoutDashboard, Tags, Settings, Plus, Filter } from 'lucide-react'; // Import icons
import { AppView } from '@/constants';

function App() {
  const [activeView, setActiveView] = useState(AppView.RESOURCES); // 'resources', 'tags', 'settings'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [isBookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [isTagFilterModalOpen, setTagFilterModalOpen] = useState(false);

  const handleApplyTagFilter = (selectedTagIds: number[]) => {
    setFilterTagIds(selectedTagIds);
  };
  const NavLink = ({ view, icon, label }: { view: AppView; icon: React.ReactNode; label: string }) => (
    <a
      href="#"
      className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-text-primary transition-colors hover:bg-surface ${
        activeView === view ? 'bg-surface font-semibold text-white' : ''
      }`}
      onClick={() => setActiveView(view)}
    >
      {icon}
      <span className="truncate">{label}</span>
    </a>
  );

  return (
    <>
      <div className="flex h-screen bg-background text-text-primary">
        {/* Sidebar */}
        <aside className="w-64 flex-col border-r border-surface bg-surface p-4 hidden md:flex">
          <div className="p-2 text-xl font-bold text-text-primary flex items-center space-x-2">
            <span>🔖</span>
            <h1>Dagger</h1>
          </div>
          <nav className="mt-8 flex flex-col space-y-2">
            <NavLink view={AppView.RESOURCES} icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavLink view={AppView.TAGS} icon={<Tags size={20} />} label="Tags" />
            <NavLink view={AppView.SETTINGS} icon={<Settings size={20} />} label="Settings" />
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            {activeView === AppView.RESOURCES && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
                  <button
                    onClick={() => setBookmarkModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
                  >
                    <Plus size={16} />
                    Add Bookmark
                  </button>
                </div>

                {/* Search and Filter Controls */}
                <div className="mb-6 rounded-lg border border-surface bg-surface p-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <input
                      type="text"
                      placeholder="Search bookmarks..."
                      className="flex-1 rounded-md border border-surface bg-surface p-2 text-text-primary placeholder-text-secondary focus:border-primary focus:ring-primary focus:outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="rounded-md border border-surface bg-surface p-2 text-text-primary focus:border-primary focus:ring-primary focus:outline-none"
                      value={filterRead === undefined ? 'all' : filterRead.toString()}
                      onChange={(e) => {
                        if (e.target.value === 'all') setFilterRead(undefined);
                        else setFilterRead(e.target.value === 'true');
                      }}
                    >
                      <option value="all">Read/Unread</option>
                      <option value="true">Read</option>
                      <option value="false">Unread</option>
                    </select>
                    {/* Tag Filter Button */}
                    <button
                      onClick={() => setTagFilterModalOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-surface/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <Filter size={16} />
                      Filter by Tags
                    </button>
                  </div>
                </div>

                <BookmarkList searchTerm={searchTerm} filterRead={filterRead} filterTagIds={filterTagIds} />
              </>
            )}

            {activeView === AppView.TAGS && (
              <>
                <h1 className="text-3xl font-bold text-text-primary mb-6">Manage Tags</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <TagForm />
                  </div>
                  <div className="md:col-span-2">
                    <TagList />
                  </div>
                </div>
              </>
            )}

            {activeView === AppView.SETTINGS && (
              <>
                <h1 className="text-3xl font-bold text-text-primary mb-6">Settings</h1>
                <ImportExport />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Add Bookmark Modal */}
      <Modal isOpen={isBookmarkModalOpen} onClose={() => setBookmarkModalOpen(false)} title="Add New Bookmark">
        <BookmarkForm onSave={() => setBookmarkModalOpen(false)} />
      </Modal>

      {/* Tag Filter Modal */}
      <TagFilterModal
        isOpen={isTagFilterModalOpen}
        onClose={() => setTagFilterModalOpen(false)}
        selectedTagIds={filterTagIds}
        onApply={handleApplyTagFilter}
      />
    </>
  );
}

export default App;