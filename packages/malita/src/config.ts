import { existsSync } from 'fs';
import path from 'path';
import { build } from 'esbuild';
import type { AppData } from './appData';
import type { Server } from 'http';
import { DEFAULT_CONFIG_FILE } from './constants';

export interface UserConfig {
  title?: string;
  keepalive?: any[];
}
export const getUserConfig = ({
  appData,
  malitaServe,
}: {
  appData: AppData;
  malitaServe: Server;
}) => {
  return new Promise(async (resolve: (value: UserConfig) => void, rejects) => {
    let config = {};
    const configFile = path.resolve(appData.paths.cwd, DEFAULT_CONFIG_FILE);
    if (existsSync(configFile)) {
      await build({
        format: 'cjs',
        logLevel: 'error',
        outdir: appData.paths.absOutputPath,
        bundle: true,
        watch: {
          onRebuild: (err, res) => {
            if (err) {
              console.error(JSON.stringify(err));
              return;
            }
            // 用户配置文件发生更改时，也重新构建包
            malitaServe.emit('REBUILD', { appData });
          },
        },
        define: {
          'process.env.NODE_ENV': JSON.stringify('development'),
        },
        external: ['esbuild'],
        entryPoints: [configFile],
      });
      try {
        // 使用require 的时候会读取缓存。对于用户配置信息，强制读取最新的文件内容
        const configFile = path.resolve(appData.paths.absOutputPath, 'malita.config.js');
        delete require.cache[configFile];
        config = require(configFile).default;
      } catch (error) {
        console.error('getUserConfig error', error);
        rejects(error);
      }
    }
    resolve(config);
  });
};
