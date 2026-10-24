import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { CallDetailsPage } from '@/pages/CallDetails';
import { DashboardPage } from '@/pages/Dashboard';
import { HistoryPage } from '@/pages/History';
import { LiveCallPage } from '@/pages/LiveCall';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'calls', element: <HistoryPage /> },
      { path: 'calls/:id', element: <CallDetailsPage /> },
      { path: 'calls/:id/live', element: <LiveCallPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: '!rounded-lg !border !border-line !bg-surface !text-ink !shadow-lift',
            description: '!text-muted',
          },
        }}
      />
    </>
  );
}
