// sanity.config.ts
import { defineConfig, buildLegacyTheme } from 'sanity';
import { structureTool } from 'sanity/structure';
import React from 'react';
import { schemaTypes } from './sanity/schemaTypes';

const emeraldTheme = buildLegacyTheme({
  '--black': '#1f2937',
  '--white': '#ffffff',
  '--brand-primary': '#10b981', 
  '--component-bg': '#ffffff',
  '--component-text-color': '#1f2937',
  '--focus-color': '#fbbf24',
});

export default defineConfig([
  {
    name: 'Balai-Dakwah-Banjarnegara',
    title: 'bdb.or.id',
    // 🚀 HARDCODE LANGSUNG DI SINI TANPA OR (||)
    projectId: 'ks29gg6v',
    dataset: 'production',
    basePath: '/studio',

    plugins: [structureTool()],

    schema: {
      types: schemaTypes,
    },

    theme: emeraldTheme,

    studio: {
      components: {
        navbar: (props) => {
          return React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column' } },
            React.createElement(
              'div',
              {
                style: {
                  background: '#e6f7f0', 
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #c2ebd9',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }
              },
              React.createElement('img', {
                src: '/images/logo-bdb.png',
                alt: 'Logo bdb.or.id',
                style: {
                  height: '52px', 
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }
              })
            ),
            props.renderDefault(props)
          );
        },
      },
    },
  }
]);