import { format } from 'prettier';

/** Format before webpack finalizes content hashes and references to assets. */
export class ReadableAssetsPlugin {
  apply(compiler) {
    const name = 'ReadableAssetsPlugin';
    const { Compilation, sources } = compiler.webpack;

    compiler.hooks.thisCompilation.tap(name, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        { name, stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE },
        async () => {
          for (const asset of compilation.getAssets()) {
            const parser = asset.name.endsWith('.js')
              ? 'babel'
              : asset.name.endsWith('.css')
                ? 'css'
                : undefined;
            if (!parser) continue;

            const readable = await format(asset.source.source().toString(), {
              parser,
              printWidth: 100,
              tabWidth: 2,
              endOfLine: 'lf',
            });
            // Next's copied legacy polyfill has a hash in its filename but no
            // contenthash metadata. Register it so webpack also renames that
            // asset and updates manifest references after its bytes change.
            const copiedHash = /\/polyfills-([a-f0-9]+)\.js$/.exec(asset.name)?.[1];
            compilation.updateAsset(asset.name, new sources.RawSource(readable), {
              ...asset.info,
              minimized: false,
              ...(copiedHash ? { contenthash: copiedHash } : {}),
            });
          }
        },
      );
    });
  }
}
