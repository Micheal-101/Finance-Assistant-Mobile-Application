import { type Href, Redirect } from 'expo-router';
import { getOnboardingAuthToken } from '@/lib/auth-session';

export default function Index() {
  return <Redirect href={(getOnboardingAuthToken() ? '/(tabs)' : '/onboarding') as Href} />;
}
