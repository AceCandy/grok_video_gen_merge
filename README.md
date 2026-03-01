# @remotion/skills

## Usage

This is an internal package and has no documentation.

## Local dev

- `npm install`
- `npm run dev`

打开浏览器访问 Vite 提示的地址（默认 `http://localhost:5173`）。

## Remotion（仅用于合并）

- 预览合并合成（可选）：`npm run dev:remotion`，在 Studio 里打开 `MergeSegments`
- 推荐方式（先顺序下载所有素材，再合并）：
  - 把 AIPipeline 导出的合并 JSON 保存为 `merge-props.json`
  - 运行 `npm run merge:local`
  - 输出在 `out/merged-<timestamp>.mp4`，下载的视频会保存到 `public/prefetched/`
- 仅示例渲染：`npm run render:merge:example`（使用 `merge-props.example.json`）

## AIPipeline notes

- Expects OpenAI-compatible `POST <Base URL>/v1/chat/completions`.
- Image/video generation is implemented by asking the model to return JSON in `choices[0].message.content`.
- API keys are stored in browser `localStorage` (do not paste production keys into untrusted pages).
