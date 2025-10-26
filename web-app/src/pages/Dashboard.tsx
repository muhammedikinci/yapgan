import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { apiService } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    notesCount: 0,
    tagsCount: 0
  });
  const [recentNotes, setRecentNotes] = useState<Array<{id: string, title: string, collection?: string}>>([]);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const [statsResponse, notesResponse] = await Promise.all([
          apiService.getStats(),
          apiService.getNotes({ page: 1, per_page: 3 })
        ]);
        
        if (isMounted) {
          setStats({
            notesCount: statsResponse.notes_count,
            tagsCount: statsResponse.tags_count
          });
          
          // Get recent notes for activity
          if (notesResponse.notes && notesResponse.notes.length > 0) {
            setRecentNotes(notesResponse.notes.map(note => ({
              id: note.id,
              title: note.title,
              collection: note.tags?.[0] || 'General'
            })));
          }
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-background-dark dark:text-background-light">Home</h1>
          <p className="text-background-dark/60 dark:text-background-light/60 mt-1">Welcome back</p>
        </header>
        
        <section>
          <h2 className="text-2xl font-bold text-background-dark dark:text-background-light mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-background-light dark:bg-background-dark/60 p-6 rounded-xl border border-primary/10 dark:border-primary/20">
              <p className="text-base font-medium text-background-dark/80 dark:text-background-light/80">Notes</p>
              <p className="text-3xl font-bold text-background-dark dark:text-background-light mt-1">{stats.notesCount}</p>
            </div>
            <div className="bg-background-light dark:bg-background-dark/60 p-6 rounded-xl border border-primary/10 dark:border-primary/20">
              <p className="text-base font-medium text-background-dark/80 dark:text-background-light/80">Tags</p>
              <p className="text-3xl font-bold text-background-dark dark:text-background-light mt-1">{stats.tagsCount}</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-background-dark dark:text-background-light mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <Link 
                  key={note.id} 
                  to={`/my/notes/${note.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg bg-background-light dark:bg-background-dark/60 border border-primary/10 dark:border-primary/20 hover:border-primary/30 dark:hover:border-primary/40 transition-all hover:shadow-lg"
                >
                  <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary shrink-0">
                    📝
                  </div>
                  <div>
                    <p className="font-medium text-background-dark dark:text-background-light">Note: '{note.title}'</p>
                    <p className="text-sm text-background-dark/60 dark:text-background-light/60">Added to '{note.collection}'</p>
                  </div>
                </Link>
              ))
            ) : (
              <>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-background-light dark:bg-background-dark/60 border border-primary/10 dark:border-primary/20">
                  <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary shrink-0">
                    📝
                  </div>
                  <div>
                    <p className="font-medium text-background-dark dark:text-background-light">No recent activity</p>
                    <p className="text-sm text-background-dark/60 dark:text-background-light/60">Start by creating your first note!</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-background-dark dark:text-background-light mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.href = '/my/new-note'}
              className="h-10 px-6 rounded-lg bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-colors"
            >
              New Note
            </button>
            <button 
              onClick={() => window.location.href = '/my/tags'}
              className="h-10 px-6 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm tracking-wide hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
            >
              Browse Tags
            </button>
            <button 
              onClick={() => window.location.href = '/my/graph'}
              className="h-10 px-6 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm tracking-wide hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
            >
              Note Graph
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
