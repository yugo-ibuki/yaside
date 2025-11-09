import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import YAML from 'yaml';
import { config as dotenvConfig } from 'dotenv';
import { GlobalConfigSchema } from '../parser/schema.js';
import type { GlobalConfig } from '../types/index.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: GlobalConfig | null = null;
  private readonly configDir: string;
  private readonly configPath: string;

  private constructor() {
    this.configDir = path.join(os.homedir(), '.ai-workflow');
    this.configPath = path.join(this.configDir, 'config.yml');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 設定を読み込む (環境変数も考慮)
   */
  async load(): Promise<GlobalConfig> {
    if (this.config) {
      return this.config;
    }

    // .env ファイルを読み込む
    dotenvConfig();

    try {
      await fs.access(this.configPath);
      const content = await fs.readFile(this.configPath, 'utf-8');
      const parsed = YAML.parse(content);

      // 環境変数で置換
      const processedConfig = this.processEnvVariables(parsed);
      this.config = GlobalConfigSchema.parse(processedConfig);
    } catch (error) {
      // 設定ファイルが存在しない場合はデフォルト設定
      this.config = this.getDefaultConfig();
    }

    return this.config;
  }

  /**
   * 設定を保存
   */
  async save(config: GlobalConfig): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
    const yamlContent = YAML.stringify(config);
    await fs.writeFile(this.configPath, yamlContent, 'utf-8');
    this.config = config;
  }

  /**
   * 設定ディレクトリを初期化
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });

    // ログディレクトリも作成
    const logDir = path.join(this.configDir, 'logs');
    await fs.mkdir(logDir, { recursive: true });

    // デフォルト設定を保存
    if (!(await this.configExists())) {
      await this.save(this.getDefaultConfig());
    }
  }

  /**
   * 設定ファイルの存在確認
   */
  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * API キーを取得 (環境変数を優先)
   */
  async getApiKey(provider: 'anthropic' | 'openai'): Promise<string | undefined> {
    const config = await this.load();

    const envKey =
      provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

    if (envKey) {
      return envKey;
    }

    return config.api_keys?.[provider];
  }

  /**
   * ログディレクトリを取得
   */
  async getLogDir(): Promise<string> {
    const config = await this.load();
    return config.log_dir || path.join(this.configDir, 'logs');
  }

  /**
   * 環境変数を処理 (${VAR_NAME} の形式を置換)
   */
  private processEnvVariables(obj: unknown): unknown {
    if (typeof obj === 'string') {
      const match = obj.match(/^\$\{([^}]+)\}$/);
      if (match) {
        return process.env[match[1]] || obj;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.processEnvVariables(item));
    }

    if (obj && typeof obj === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.processEnvVariables(value);
      }
      return processed;
    }

    return obj;
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(): GlobalConfig {
    return {
      default_agent: {
        type: 'claude',
        model: 'claude-sonnet-4-5',
      },
      log_level: 'info',
      log_dir: path.join(this.configDir, 'logs'),
    };
  }

  /**
   * 設定をリセット (テスト用)
   */
  reset(): void {
    this.config = null;
  }
}
