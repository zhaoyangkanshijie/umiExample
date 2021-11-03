# umiExample

## 参考链接

* [umi3教程(看完没入门就来打我)](https://juejin.cn/post/7021358536504393741)
* [UmiJS](https://umijs.org/zh-CN/docs/getting-started)

## 目录

* [基础](#基础)
* [目录结构](#目录结构)
* [配置](#配置)
* [路由](#路由)
* [模板](#模板)
* [Mock](#Mock)
* [资源](#资源)
* [按需加载](#按需加载)
* [部署](#部署)
* [服务端渲染](#服务端渲染)

---

## 基础

Umi(乌米)是企业级react(ts)框架。

* 兼容性

  * node >= v10.13.0
  * IE9+
  * react > v16.8.0
  * 不可自定义webpack
  * 不可选择多种路由方案

* 其它react框架对比

  * create-react-app

    基于 webpack 的打包层方案，但是不包含路由，不是框架，也不支持配置。

  * next.js

    不够贴近业务： antd、dva 的深度整合，比如国际化、权限、数据流、配置式路由、补丁方案、自动化 external 方面等

* 项目创建

  * npm create @umijs/umi-app

  * npm install

  * npm run start

  * 添加ant-design: npm install @ant-design/pro-layout

  * 打包: npm run build 

  * 配置 prettier,eslint, stylelint

    npm install @umijs/fabric -D

    删除.prettierrc文件,新建4个文件：.eslintrc.js、.prettierrc.js、.stylelintrc.js、.eslintignore

    ```js
    //.eslintrc.js 配置
    module.exports = {
      extends: [require.resolve('@umijs/fabric/dist/eslint')],

      // in antd-design-pro
      globals: {
        ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION: true,
        page: true,
      },

      rules: {
        // your rules
        'prefer-const': 0,
      },
    };

    //.prettierrc.js 配置
    const fabric = require('@umijs/fabric')

    module.exports = {
      ...fabric.prettier,
      semi: false,
    }

    //.stylelintrc.js 配置
    const fabric = require('@umijs/fabric')

    module.exports = {
      ...fabric.stylelint,
    }

    //.eslintignore
    .eslintrc.js
    node_modules

    //package.json
    "*.ts?(x)": [
      "prettier --parser=typescript --write",
      "eslint --fix"
    ]
    ```


## 目录结构

```txt
.
├── package.json
├── .umirc.ts 配置文件，包含 umi 内置功能和插件的配置，优先级高于config文件
├── .env 环境变量，如PORT=8888
├── config
    ├── config.{env}.js 如需使用config，需删除.umirc.ts
├── dist 打包产物
├── mock 目录下所有 js 和 ts 文件会被解析为 mock 文件
├── public 目录下所有文件会被 copy 到输出路径
└── src
    ├── .umi 临时文件目录，不要提交 .umi 目录到 git 仓库，他们会在 umi dev 和 umi build 时被删除并重新生成
    ├── layouts/index.tsx 约定式路由时的全局布局文件
    ├── pages 组件
        ├── index.less
        └── index.tsx
    └── app.ts 运行时配置文件，可以在这里扩展运行时的能力，比如修改路由、修改 render 方法
```

## 配置

* 多环境配置

  npm install cross-env --dev

  package.json
  ```json
  "start": "cross-env UMI_ENV=dev umi dev",
  "start:test": "cross-env UMI_ENV=test umi dev",
  "start:prd": "cross-env UMI_ENV=prd umi dev",
  "build": "cross-env UMI_ENV=dev umi build",
  "build:test": "cross-env UMI_ENV=test umi build",
  "build:prd": "cross-env UMI_ENV=prd umi build",
  ```

  config文件夹下新建config.dev.ts,config.test.ts,config.prd.ts，代表开发环境,测试环境,生产环境的配置文件
  ```js
  //config.dev.ts
  import { defineConfig } from 'umi';
  export default defineConfig({
    define: {
      CurrentEnvironment: 'dev',
    },
  });

  //config.test.ts
  import { defineConfig } from 'umi';
  export default defineConfig({
    define: {
      CurrentEnvironment: 'test',
    },
  });

  //config.prd.ts
  import { defineConfig } from 'umi';
  export default defineConfig({
    define: {
      CurrentEnvironment: 'prd',
    },
  });
  ```

  typings.d.ts
  ```ts
  // 声明当前的环境
  declare const CurrentEnvironment: 'dev' | 'test' | 'prd';
  ```

  index.tsx中console.log(CurrentEnvironment)能打印相应环境

* 运行时配置

  app.tsx

  1. 在微前端里动态修改渲染根节点

    ```ts
    let isSubApp = false;
    export function modifyClientRenderOpts(memo) {
      return {
        ...memo,
        rootElement: isSubApp ? 'sub-root' : memo.rootElement,    
      };
    }
    ```

  2. 修改路由

    ```ts
    export function patchRoutes({ routes }) {
      routes.unshift({
        path: '/foo',
        exact: true,
        component: require('@/extraRoutes/foo').default,
      });
    }
    ```

  3. 请求服务端根据响应动态更新路由

    ```ts
    let extraRoutes;

    export function patchRoutes({ routes }) {
      merge(routes, extraRoutes);
    }

    export function render(oldRender) {
      fetch('/api/routes').then(res=>res.json()).then((res) => { 
        extraRoutes = res.routes;
        oldRender();
      })
    }
    ```

  4. 渲染之前做权限校验

    ```ts
    import { history } from 'umi';

    export function render(oldRender) {
      fetch('/api/auth').then(auth => {
        if (auth.isLogin) { oldRender() }
        else { 
          history.push('/login'); 
          oldRender()
        }
      });
    }
    ```

  5. 在初始加载和路由切换时做埋点统计

    ```ts
    export function onRouteChange({ location, routes, action }) {
      bacon(location.pathname);
    }
    ```

  6. 在初始加载和路由切换时设置标题

    ```ts
    export function onRouteChange({ matchedRoutes }) {
      if (matchedRoutes.length) {
        document.title = matchedRoutes[matchedRoutes.length - 1].route.title || '';
      }
    }
    ```

  7. 修改交给 react-dom 渲染时的根组件，在外面包一个 Provider

    ```ts
    export function rootContainer(container) {
      return React.createElement(ThemeProvider, null, container);
    }
    ```

* 更多配置

  [官方配置](https://umijs.org/zh-CN/config)

## 路由

* 路由定义
```ts
export default {
  routes: [
    // exact是否精确匹配
    // url 为 /one/two 时匹配失败
    { path: '/one', exact: true },
    
    // url 为 /one/two 时匹配成功
    { path: '/one' },
    { path: '/one', exact: false },

    //component为相对路径，会从 src/pages 开始找起，如果指向 src 目录的文件，可以用 @，也可以用 ../。
    //比如 component: '@/layouts/basic'，或者 component: '../layouts/basic'，推荐用前者。
    { path: '/login', component: 'login' },

    //子路由
    {
      path: '/',
      component: '@/layouts/index',
      routes: [
        { path: '/list', component: 'list' },
        { path: '/admin', component: 'admin' },
      ],
    }, 
    //src/layouts/index 通过 props.children 渲染子路由
    //export default (props) => {
    //  return <div style={{ padding: 20 }}>{ props.children }</div>;
    //}

    //路由跳转
    { exact: true, path: '/', redirect: '/list' },
    { exact: true, path: '/list', component: 'list' },

    //权限校验
    { path: '/user', component: 'user',
      wrappers: [
        '@/wrappers/auth',
      ],
    },
    // src/wrappers/auth
    // import { Redirect } from 'umi'
    // export default (props) => {
    //   const { isLogin } = useAuth();
    //   if (isLogin) {
    //     return <div>{ props.children }</div>;
    //   } else {
    //     return <Redirect to="/login" />;
    //   }
    // }

    //title配置路由标题
  ],
}
```

* 页面跳转
```ts
import { history } from 'umi';

// 跳转到指定路由
history.push('/list');

// 带参数跳转到指定路由
history.push('/list?a=b');
history.push({
  pathname: '/list',
  query: {
    a: 'b',
  },
});

// 跳转到上一个路由
history.goBack();

import { Link } from 'umi';

export default () => (
  <div>
    <Link to="/users">Users Page</Link>
  </div>
);
```

* 路由组件参数

  路由组件可通过 props 获取到以下属性

  * match，当前路由和 url match 后的对象，包含 params、path、url 和 isExact 属性
  * location，表示应用当前处于哪个位置，包含 pathname、search、query 等属性
  * history，包含length、action、location属性
  * route，当前路由配置，包含 path、exact、component、routes 等
  * routes，全部路由信息

  ```ts
  export default function(props) {
    console.log(props.route);
    return <div>Home Page</div>;
  }
  ```

* 传递参数给子路由

  ```ts
  import React from 'react';

  export default function Layout(props) {
    return React.Children.map(props.children, child => {
      return React.cloneElement(child, { foo: 'bar' });
    });
  }
  ```

* 约定式路由

  1. 默认

    ```txt
    └── pages
        ├── index.tsx
        └── users.tsx
    ```
    ```js
    [
      { exact: true, path: '/', component: '@/pages/index' },
      { exact: true, path: '/users', component: '@/pages/users' },
    ]
    ```

    * 满足以下任意规则的文件不会被注册为路由：

      * 以 . 或 _ 开头的文件或目录
      * 以 d.ts 结尾的类型定义文件
      * 以 test.ts、spec.ts、e2e.ts 结尾的测试文件（适用于 .js、.jsx 和 .tsx 文件）
      * components 和 component 目录
      * utils 和 util 目录
      * 不是 .js、.jsx、.ts 或 .tsx 文件
      * 文件内容不包含 JSX 元素

  2. 动态路由

    * src/pages/users/[id].tsx 会成为 /users/:id
    * src/pages/users/[id]/settings.tsx 会成为 /users/:id/settings

  3. 动态可选路由

    * src/pages/users/[id$].tsx 会成为 /users/:id?
    * src/pages/users/[id$]/settings.tsx 会成为 /users/:id?/settings

  4. 嵌套路由

    目录下有 _layout.tsx 时会生成嵌套路由，以 _layout.tsx 为该目录的 layout。layout 文件需要返回一个 React 组件，并通过 props.children 渲染子组件。

    ```txt
    └── pages
        └── users
            ├── _layout.tsx
            ├── index.tsx
            └── list.tsx
    ```
    ```ts
    [
      { exact: false, path: '/users', component: '@/pages/users/_layout',
        routes: [
          { exact: true, path: '/users', component: '@/pages/users/index' },
          { exact: true, path: '/users/list', component: '@/pages/users/list' },
        ]
      }
    ]
    ```

  5. 全局 layout

    src/layouts/index.tsx 为全局路由。返回一个 React 组件，并通过 props.children 渲染子组件。

    ```txt
    └── src
        ├── layouts
        │   └── index.tsx
        └── pages
            ├── index.tsx
            └── users.tsx
    ```
    ```ts
    [
      { exact: false, path: '/', component: '@/layouts/index',
        routes: [
          { exact: true, path: '/', component: '@/pages/index' },
          { exact: true, path: '/users', component: '@/pages/users' },
        ],
      },
    ]
    ```

  6. 不同的全局 layout

    src/layouts/index.tsx
    ```ts
    export default function(props) {
      if (props.location.pathname === '/login') {
        return <SimpleLayout>{ props.children }</SimpleLayout>
      }

      return (
        <>
          <Header />
          { props.children }
          <Footer />
        </>
      );
    }
    ```

  7. 404 路由

    ```txt
    └── pages
        ├── 404.tsx
        ├── index.tsx
        └── users.tsx
    ```
    ```ts
    [
      { exact: true, path: '/', component: '@/pages/index' },
      { exact: true, path: '/users', component: '@/pages/users' },
      { component: '@/pages/404' },
    ]
    ```

  8. 权限路由

    通过指定高阶组件 wrappers 达成效果。

    src/pages/user
    ```ts
    import React from 'react'

    function User() {
      return <>user profile</>
    }

    User.wrappers = ['@/wrappers/auth']

    export default User
    ```

    src/wrappers/auth
    ```ts
    import { Redirect } from 'umi'

    export default (props) => {
      const { isLogin } = useAuth();
      if (isLogin) {
        return <div>{ props.children }</div>;
      } else {
        return <Redirect to="/login" />;
      }
    }
    ```

  9. 扩展路由属性

    通过导出静态属性的方式扩展路由
    ```ts
    function HomePage() {
      return <h1>Home Page</h1>;
    }

    HomePage.title = 'Home Page';//title 会附加到路由配置中

    export default HomePage;
    ```

## 模板

src/pages/document.ejs如果这个文件存在，会作为默认模板
```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Your App</title>
  <link rel="icon" type="image/x-icon" href="<%= context.config.publicPath %>favicon.png" />
  <!-- context 包含 route 和config -->
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

## Mock

```ts
//import mockjs from 'mockjs';

export default {
  // 支持值为 Object 和 Array
  'GET /api/users': { users: [1, 2] },//访问 /api/users 就能得到 { users: [1,2] } 的响应

  // GET 可忽略
  '/api/users/1': { id: 1 },

  // 'GET /api/tags': mockjs.mock({
  //   'list|100': [{ name: '@city', 'value|1-100': 50, 'type|0-2': 1 }],
  // }),

  // 支持自定义函数，API 参考 express@4
  'POST /api/users/create': (req, res) => {
    // 添加跨域请求头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end('ok');
  },
}
```

## 资源

* css

  * 全局样式:src/global.css
  * CSS Modules
    ```ts
    // CSS Modules
    import styles from './foo.css';

    // 非 CSS Modules
    import './foo.css';

    .logo {
      background: url(./foo.png);
    }

    .logo {
      background: url(~@/foo.png);
    }
    ```
  * umi内置less，sass和stylus需通过 chainWebpack 配置或者 umi 插件的形式支持

* 图片

  ```ts
  export default () => <img src={require('./foo.png')} />
  export default () => <img src={require('@/foo.png')} />

  import { ReactComponent as Logo } from './logo.svg'
  function Analysis() {
    return <Logo width={90} height={120} />
  }
  ```

* svg

  ```ts
  import { ReactComponent as Logo } from './logo.svg'
  function Analysis() {
    return <Logo width={90} height={120} />
  }
  ```
  ```ts
  import logoSrc from './logo.svg'
  function Analysis() {
    return <img src={logoSrc} alt="logo" />
  }
  ```

## 按需加载

config开启
```js
export default {
  dynamicImport: {},
}
```

封装一个异步组件
```js
import { dynamic } from 'umi';

export default dynamic({
  loader: async function() {
    // 这里的注释 webpackChunkName 可以指导 webpack 将该组件 HugeA 以这个名字单独拆出去
    const { default: HugeA } = await import(/* webpackChunkName: "external_A" */ './HugeA');
    return HugeA;
  },
});
```

使用异步组件
```js
import React from 'react';
import AsyncHugeA from './AsyncHugeA';

// 像使用普通组件一样即可
// dynamic 为你做:
// 1. 异步加载该模块的 bundle
// 2. 加载期间 显示 loading（可定制）
// 3. 异步组件加载完毕后，显示异步组件
export default () => {
  return <AsyncHugeA />;
}
```

## 部署

* 默认方案

  不做按需加载处理，umi build 后输出 index.html、umi.js 和 umi.css 三个文件

* 不输出 html 文件

  HTML=none umi build

* 部署 html 到非根目录，导致页面空白问题

  把应用部署在 /xxx/ 下，然后访问 /xxx/hello，而代码里匹配的是 /hello，那就匹配不上了

  config
  ```js
  export default {
    base: '/path/to/your/app/root',
  };
  ```

* 使用 hash history

  config
  ```js
  export default {
    history: { type: 'hash' },
  };
  ```

* 按需加载

  config
  ```js
  export default {
    dynamicImport: {},
  };
  ```

* 静态资源在非根目录或 cdn

  config
  ```js
  export default {
    publicPath: "http://yourcdn/path/to/static/"
  }
  ```

* 使用 runtime 的 publicPath

  在 html 里判断环境做不同的输出，可通过配置 runtimePublicPath 为解决

  config
  ```js
  export default {
    runtimePublicPath: true,
  };
  ```

  html
  ```html
  <script>
  window.publicPath = <%= YOUR PUBLIC_PATH %>
  </script>
  ```

* 静态化

  让每个路由都输出 index.html 的内容，那么就要做静态化

  config
  ```js
  export default {
    exportStatic: {},
  }
  ```

  执行 umi build，会为每个路由输出一个 html 文件，不支持有变量路由的场景
  ```txt
  ./dist
  ├── index.html
  ├── list
  │   └── index.html
  └── static
      ├── pages__index.5c0f5f51.async.js
      ├── pages__list.f940b099.async.js
      ├── umi.2eaebd79.js
      └── umi.f4cb51da.css
  ```

  如需生成如下文件
  ```txt
  ├── index.html
  ├── list
  │   └── index.html

  ./dist
  ├── index.html
  ├── list.html
  └── static
      ├── pages__index.5c0f5f51.async.js
      ├── pages__list.f940b099.async.js
      ├── umi.2924fdb7.js
      └── umi.cfe3ffab.css
  ```

  可配置config
  ```js
  export default {
    exportStatic: {
      htmlSuffix: true,
    },
  }
  ```

## 服务端渲染

* config启用服务端渲染

  ```js
  export default {
    ssr: {},
  }
  ```

* 页面数据预获取getInitialProps

  * ctx参数

    * match： 与客户端页面 props 中的 match 保持一致，有当前路由的相关数据。
    * isServer：是否为服务端在执行该方法。
    * route：当前路由对象
    * history：history 对象

  ```ts
  // pages/index.tsx
  import { IGetInitialProps } from 'umi';
  import React from 'react';

  const Home = (props) => {
    const { data } = props;
    return (
      {/* <div>Hello World</div> */}
      <div>{data.title}</div>
    )
  }

  Home.getInitialProps = (async (ctx) => {
    return Promise.resolve({
      data: {
        title: 'Hello World',
      }
    })
  }) as IGetInitialProps;

  /** 同时也可以使用 class 组件
  class Home extends React.Component {
    static getInitialProps = (async (ctx) => {
      return Promise.resolve({
        data: {
          title: 'Hello World',
        }
      })
    }) as IGetInitialProps
    render() {
      const { data } = props;
      return (
        <div>{data.title}</div>
      )
    }
  }
  */

  export default Home;
  ```

  * 自定义ctx参数modifyGetInitialPropsCtx

    1. dva

      plugin-dva/runtime.ts
      ```ts
      export const ssr = {
        modifyGetInitialPropsCtx: async (ctx) => {
          ctx.store = getApp()._store;
        },
      }
      ```

      页面pages/index.tsx
      ```ts
      const Home = () => <div />;

      Home.getInitialProps = async (ctx) => {
        const state = ctx.store.getState();
        return state;
      }

      export default Home;
      ```

    2. app

      app.(ts|js)
      ```ts
      export const ssr = {
        modifyGetInitialPropsCtx: async (ctx) => {
          ctx.title = 'params';
          return ctx;
        }
      }
      ```

    3. 服务端

      ```ts
      app.use(async (req, res) => {
        // 或者从 CDN 上下载到 server 端
        // const serverPath = await downloadServerBundle('http://cdn.com/bar/umi.server.js');
        const render = require('./dist/umi.server');
        res.setHeader('Content-Type', 'text/html');

        const context = {};
        const { html, error, rootContainer } = await render({
          // 有需要可带上 query
          path: req.url,
          context,
          getInitialPropsCtx: {
            req,
          },
        });
      })
      ```

      页面
      ```ts
      Page.getInitialProps = async (ctx) => {
        if (ctx.isServer) {
          // console.log(ctx.req);
        }
        return {};
      }
      ```

  * 注意

    * 开启 ssr，未开启 forceInitial，首屏不触发 getInitialProps，切换页面时会执行请求
    * 开启 ssr，开启 forceInitial，无论是首屏还是页面切换，都会触发 getInitialProps
    * 未开启 ssr 时，只要页面组件中有 getInitialProps 静态方法，则会执行该方法

* 部署

  执行 umi build，会多一个服务端文件： umi.server.js

  * 在后端框架中，引用该文件
  
    ```js
    // Express
    app.use(async (req, res) => {
      // 或者从 CDN 上下载到 server 端
      // const serverPath = await downloadServerBundle('http://cdn.com/bar/umi.server.js');
      const render = require('./dist/umi.server');
      res.setHeader('Content-Type', 'text/html');

      const context = {};
      // html 内容，服务端渲染错误后，会返回原始 html
      // 错误对象，服务端渲染错误后，值不为 null
      // 挂载节点中的渲染内容（ssr 渲染实际上只是渲染挂载节点中的内容），同时你也可以用该值来拼接自定义模板
      const { html, error, rootContainer } = await render({
        // 有需要可带上 query
        path: req.url,// 渲染页面路由，支持 `base` 和带 query 的路由，通过 umi 配置
        context,// 上下文数据，可用来标记服务端渲染页面时的状态

        // 可选，html 模板，这里可自定义模板，默认是用 umi 内置的 html
        // htmlTemplate: defaultHtml,

        // 启用流式渲染
        // mode: 'stream',

        // html 片段静态标记（适用于静态站点生成）
        // staticMarkup: false,

        // 扩展 getInitialProps 在服务端渲染中的参数
        // getInitialPropsCtx: {},

        // manifest，正常情况下不需要

        //initialData:{}可选，初始化数据，传透传到 getInitialProps 方法的参数中

        //mountElementId:'root'可选，页面内容挂载节点，与 htmlTemplate 配合使用，默认为 root

        //origin:'https://www.***.com' ${protocol}://${host} 扩展 location 对象
      });

      // support stream content
      if (content instanceof Stream) {
        html.pipe(res);
        html.on('end', function() {
          res.end();
        });
      } else {
        res.send(res);
      }
    })
    ```

  * polyfill

    ```js
    // app.ts
    export const ssr = {
      beforeRenderServer: async ({
        env,
        location,
        history,
        mode,
        context,
      }) => {
        // global 为 Node.js 下的全局变量
        // 避免直接 mock location，这样会造成一些环境判断失效
        global.mockLocation = location;

        // 国际化
        if (location.pathname.indexOf('zh-CN') > -1) {
          global.locale = 'zh-CN'
        }
      }
    }
    ```

  * 动态加载（dynamicImport）

    config
    ```js
    export default {
      ssr: {},
      dynamicImport: {},
    }
    ```

    启动和构建会自动开启 manifest 配置，并在产物目录中生成 asset-manifest.json 做资源映射，并自动将页面对应的资源注入到 HTML 中
    ```txt
    - dist
      - umi.server.js
      - asset-manifest.json
    ```

    页面
    ```html
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="/umi.css" />
    +   <link rel="stylesheet" href="/p__index.chunk.css" />
      </head>
    </html>
    ```

* 流式渲染（Streaming）

  config
  ```js
  export default {
    ssr: {
      mode: 'stream',
    },
  }
  ```

* 预渲染

  config
  ```js
  export default {
    ssr: {},
    exportStatic: {},
  }
  ```

  * 预渲染动态路由

    config
    ```js
      export default {
      ssr: {},
      exportStatic: {
    +   extraRoutePaths: async () => {
    +     // const result = await request('https://your-api/news/list');
    +     return Promise.resolve(['/news/1', 'news/2']);
    +   }
      },
      routes: [
        {
          path: '/',
          component: '@/layout',
          routes: [
            { path: '/', component: '@/pages/index' },
            { path: '/news', component: '@/pages/news' },
            { path: '/news/:id', component: '@/pages/news/detail' }
          ]
        }
      ]
    }
    ```

    ```txt
    - dist
      - umi.js
      - umi.css
      - index.html
      - news
        - :id
          - index.html
    +   - 1
    +     - index.html
    +   - 2
    +     - index.html
        - index.html
    ```

    预渲染后会删除 umi.server.js 服务端入口文件，如果需要保留，可使用变量 RM_SERVER_FILE=none 来保留

* 页面标题渲染

  npm install @umijs/preset-react

  ```ts
  // pages/bar.tsx
  import React from 'react';
  import { Helmet } from 'umi';

  export default props => {
    return (
      <>
        {/* 可自定义需不需要编码 */}
        <Helmet encodeSpecialCharacters={false}>
          <html lang="en" data-direction="666" />
          <title>Hello Umi Bar Title</title>
        </Helmet>
      </>
    );
  };
  ```

* 与 dva 结合使用

  npm install @umijs/preset-react

  config
  ```js
  export default {
    ssr: {},
    dva: {}
  }
  ```

  这时候 getInitialProps(ctx) 中的 ctx 就会有 store 属性，可执行 dispatch，并返回初始化数据。
  ```ts
  Page.getInitialProps = async (ctx) => {
    const { store } = ctx;
    store.dispatch({
      type: 'bar/getData',
    });
    return store.getState();
  }
  ```

* 包大小分析

  ```conf
  # 服务端包大小分析
  $ ANALYZE_SSR=1 umi build
  # 客户端包大小分析
  $ ANALYZE=1 umi build
  ```

* 注意

  1. window is not defined, document is not defined, navigator is not defined
  
    * 将访问的 DOM/BOM 方法放在 componentDidMount、useEffect 中（服务端不会执行），避免服务端执行时报错

      ```ts
      import React from 'react';

      export default () => {
      - window.alert(1);
        React.useEffect(() => {
      +   window.alert(1);
        }, []);

        return (
          <div>Hello</div>
        )
      }
      ```

    * 通过 umi 提供的 isBrowser 方法做环境判断

      ```ts
      import React from 'react';
      + import { isBrowser } from 'umi';

      export default () => {
      - window.alert(1);
      + if (!isBrowser()) {
          window.alert(1);
      + }

        return (
          <div>Hello</div>
        )
      }
      ```

    * 第三方库可以通过 umi 提供的 dynamic 动态加载组件

      ```ts
      import React from 'react';
      import { dynamic } from 'umi';

      const renderLoading = () => <p>组件动态加载中...</p>

      export default dynamic({
          loader: async () => {
              // 动态加载第三方组件
              const { default: DynamicComponent } = await import(
                  /* webpackChunkName: "dynamic-component" */ 'dynamic-component'
              );
              return DynamicComponent;
          },
          loading: () => renderLoading(),
      });
      ```

      避免ssr渲染时报 did not match.警告，使用时候ssr应当渲染相同loading组件
      ```ts
      import React from 'react';
      import { isBrowser } from 'umi';
      import DynamicComponent from 'DynamicComponent';

      export default () => {
        if(isBrowser()) return <DynamicComponent />
        return renderLoading()
      }
      ```
