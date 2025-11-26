import { useState } from 'react';
import TagList from '@/components/TagList';
import TagForm from '@/components/TagForm';
import BookmarkForm from '@/components/BookmarkForm';
import BookmarkList from '@/components/BookmarkList';
import ImportExport from '@/components/ImportExport';
import Modal from '@/components/Modal'; // Import the new Modal component
import { LayoutDashboard, Tags, Settings, Plus } from 'lucide-react'; // Import icons

function App() {
  const [activeView, setActiveView] = useState('resources'); // 'resources', 'tags', 'settings'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [isBookmarkModalOpen, setBookmarkModalOpen] = useState(false);

  const NavLink = ({ view, icon, label }: { view: string; icon: React.ReactNode; label: string }) => (
    <a
      href="#"
      className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-slate-300 transition-colors hover:bg-slate-700/50 ${
        activeView === view ? 'bg-slate-700 font-semibold text-white' : ''
      }`}
      onClick={() => setActiveView(view)}
    >
      {icon}
      <span className="truncate">{label}</span>
    </a>
  );

  return (
    <>
      <div className="flex h-screen bg-slate-900 text-slate-300">
        {/* Sidebar */}
        <aside className="w-64 flex-col border-r border-slate-700/50 bg-slate-800/50 p-4 hidden md:flex">
          <div className="p-2 text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>🔖</span>
            <h1>LinkVault</h1>
          </div>
          <nav className="mt-8 flex flex-col space-y-2">
            <NavLink view="resources" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavLink view="tags" icon={<Tags size={20} />} label="Tags" />
            <NavLink view="settings" icon={<Settings size={20} />} label="Settings" />
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            {activeView === 'resources' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
                  <button
                    onClick={() => setBookmarkModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    <Plus size={16} />
                    Add Bookmark
                  </button>
                </div>

                {/* Search and Filter Controls */}
                <div className="mb-6 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <input
                      type="text"
                      placeholder="Search bookmarks..."
                      className="flex-1 rounded-md border border-slate-600 bg-slate-700/50 p-2 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="rounded-md border border-slate-600 bg-slate-700/50 p-2 text-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
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
                    {/* TODO: Add Tag filter and Date range filter */}
                  </div>
                </div>

                <BookmarkList searchTerm={searchTerm} filterRead={filterRead} filterTagIds={filterTagIds} />
              </>
            )}

            {activeView === 'tags' && (
              <>
                <h1 className="text-3xl font-bold text-slate-100 mb-6">Manage Tags</h1>
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

            {activeView === 'settings' && (
              <>
                <h1 className="text-3xl font-bold text-slate-100 mb-6">Settings</h1>
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
    </>
  );
}

export default App;