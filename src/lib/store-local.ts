import { promises as fs } from "node:fs";
import path from "node:path";
import type { Backend } from "./store-backend";
import type { Recipe } from "./types";

// Local JSON files in the project's data/ folder. Used on this computer when Supabase is not configured.
const DATA_DIR = path.join(process.cwd(), "data");
const RECIPES_FILE = path.join(DATA_DIR, "recipes.json");
const IMAGE_DIR = path.join(DATA_DIR, "images");
const settingFile = (key: string) => path.join(DATA_DIR, `${key.replace(/[^\w-]/g, "")}.json`);

let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Partial<Recipe>[]> {
  try {
    return JSON.parse(await fs.readFile(RECIPES_FILE, "utf8")) as Partial<Recipe>[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export const localBackend: Backend = {
  listRecipes: readAll,
  async getRecipe(id) {
    return (await readAll()).find((r) => r.id === id) ?? null;
  },
  async getRecipeByToken(token) {
    return (await readAll()).find((r) => r.shareToken === token) ?? null;
  },
  saveRecipe(recipe) {
    return serialize(async () => {
      const all = await readAll();
      const i = all.findIndex((r) => r.id === recipe.id);
      if (i >= 0) all[i] = recipe;
      else all.push(recipe);
      await writeJson(RECIPES_FILE, all);
    });
  },
  deleteRecipe(id) {
    return serialize(async () => {
      await writeJson(RECIPES_FILE, (await readAll()).filter((r) => r.id !== id));
    });
  },
  async readSetting<T>(key: string) {
    try {
      return JSON.parse(await fs.readFile(settingFile(key), "utf8")) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  },
  writeSetting(key, value) {
    return serialize(() => writeJson(settingFile(key), value));
  },
  async putImage(name, data) {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
    await fs.writeFile(path.join(IMAGE_DIR, name), data);
  },
  async deleteImage(name) {
    await fs.rm(path.join(IMAGE_DIR, name), { force: true });
  },
  async getImage(name) {
    try {
      return await fs.readFile(path.join(IMAGE_DIR, name));
    } catch {
      return null;
    }
  },
};
