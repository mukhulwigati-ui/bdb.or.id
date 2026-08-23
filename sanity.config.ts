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
                  // 🚀 Diubah menjadi hijau yang jauh lebih gelap agar logo lebih jelas & kontras
                  background: '#064e3b', 
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #022c22',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }
              },
              React.createElement('img', {
                src: '/images/logo-bdb.png',
                alt: 'Logo bdb.or.id',
                style: {
                  height: '52px', 
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  // Jika logo Anda berwarna putih/terang, ini akan membuatnya semakin pas
                  filter: 'brightness(0) invert(1)', 
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