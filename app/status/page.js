import StatusDashboard from '../../components/StatusDashboard';

export const metadata = {
  title: 'SYNTH Status — Live service signals',
  description: 'Live SYNTH service signals and observed request history, based on real task outcomes.',
};

export default function StatusPage() {
  return <StatusDashboard />;
}
