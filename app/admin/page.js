import { redirect } from 'next/navigation';

export const metadata = {
  title: 'SYNTH Learning Studio',
  robots: { index: false, follow: false },
};

export default function Page() {
  redirect('/learning-studio');
}
