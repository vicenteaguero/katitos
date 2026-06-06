import { Link } from 'react-router';
import { Empty, Button } from '@kernel/ui';

export function NotFoundRoute() {
  return (
    <Empty
      icon="🧭"
      title="Lost in space"
      hint="This page doesn't exist."
      action={
        <Link to="/">
          <Button>Go home</Button>
        </Link>
      }
    />
  );
}
