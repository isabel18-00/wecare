import { createClient } from '@/utils/supabase/server';

export default async function UserDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user-specific data here
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', user?.id)
    .order('scheduled_at', { ascending: true })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      {/* User-specific dashboard content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats cards will go here */}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Upcoming appointments */}
        <div className="col-span-4 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
          {appointments?.length ? (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">{new Date(appt.scheduled_at).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">{appt.notes || 'No notes'}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No upcoming appointments</p>
          )}
        </div>
        
        {/* Recent activity */}
        <div className="col-span-3 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <p className="text-muted-foreground">Your recent activity will appear here</p>
        </div>
      </div>
    </div>
  );
}
