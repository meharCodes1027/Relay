import { getApp } from "../backend/src/runtime.js";

let appPromise;

export default async function handler(request, response) {
  appPromise ??= getApp();
  const app = await appPromise;
  return app(request, response);
}
