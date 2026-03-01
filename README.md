# grok视频生成合并

![1](/image/1.png)
![2](/image/2.png)

## Local dev

- `npm install`
- `npm run dev`

打开浏览器访问 Vite 提示的地址（默认 `http://localhost:5173`）。

## 分镜脚本
用来在别的地方对话生成分镜脚本（为了更方便，项目页面本身可以进行生成），可以带上图片，效果更好
- 帮我生成一组分镜提示词，需要注意的是，分镜不是按照画面分镜，而是按照每六秒钟的画面分镜。输出结构要求：\n{\n  \"title\": string,\n  \"style\": {\"overall\": string, \"characters\": string, \"camera\": string, \"lighting\": string},\n  \"segments\": [\n    {\n      \"segment_index\": number,\n      \"segment_title\": string,\n      \"segment_summary\": string,\n      \"duration_s\": number,\n      \"first_frame_prompt\": string,\n      \"video_prompt\": string,\n      \"shots\": [\n        {\"shot_index\": number, \"duration_s\": number, \"visual\": string, \"camera\": string, \"action\": string, \"dialogue\": string}\n      ]\n    }\n  ]\n}\n。语言：全部使用中文。视频内容为一个美女在有霓虹灯光的街道上转身，显摆一下身材后给观众一个飞吻

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
