import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import ProfilePage from '@/pages/profile';
import ReportPage from '@/pages/report';
import ReportsPage from '@/pages/reports';
import ReportDetailPage from '@/pages/report-detail';
import ProjectsPage from '@/pages/projects';
import ProjectDetailPage from '@/pages/project-detail';
import AccountPage from '@/pages/account';
import AdminPage from '@/pages/admin';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/report" component={ReportPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/reports/:id" component={ReportDetailPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/projects/:id" component={ProjectDetailPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
