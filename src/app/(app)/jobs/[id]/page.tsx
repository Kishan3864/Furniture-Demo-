import View from './view';

// Static export: one placeholder page per dynamic route; Firebase Hosting rewrites
// every real id to it and the client reads the id from the URL (see useRouteParam).
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <View />;
}
