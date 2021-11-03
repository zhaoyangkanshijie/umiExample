import { defineConfig } from 'umi';
import routes from './routes';

export default defineConfig({
  layout: {},
  nodeModulesTransform: {
    type: 'none',
  },
  routes: routes,
  fastRefresh: {},
  mfsu:{}
});
