import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { Patients } from './pages/Patients';
import { Conversations } from './pages/Conversations';
import { Doctors } from './pages/Doctors';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { api } from './api/client';
import { AWSStatus } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<any>(null);
  const [awsStatus, setAwsStatus] = useState<AWSStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [dashMetrics, awsData] = await Promise.all([
        api.getDashboardMetrics(),
        api.getAWSStatus(),
      ]);
      setMetrics(dashMetrics);
      setAwsStatus(awsData);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            metrics={metrics}
            onNavigate={(tab) => setCurrentTab(tab)}
            onRefresh={loadData}
          />
        );
      case 'appointments':
        return <Appointments onRefresh={loadData} />;
      case 'patients':
        return <Patients />;
      case 'conversations':
        return <Conversations />;
      case 'doctors':
        return <Doctors />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings awsStatus={awsStatus} onRefresh={loadData} />;
      default:
        return (
          <Dashboard
            metrics={metrics}
            onNavigate={(tab) => setCurrentTab(tab)}
            onRefresh={loadData}
          />
        );
    }
  };

  return (
    <Layout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      awsStatus={awsStatus}
      onRefresh={loadData}
      isRefreshing={isRefreshing}
    >
      {renderActivePage()}
    </Layout>
  );
}

export default App;
