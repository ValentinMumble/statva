import {useRoutes} from '../hooks';

const Routes = () => {
  const routes = useRoutes();

  return (
    <>
      {routes.map(route => (
        <div key={route.id}>{route.name}</div>
      ))}
    </>
  );
};

export {Routes};
