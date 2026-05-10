import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface RuntimeAppConfig {
  apiUrl: string;
  appName?: string;
  clinicName?: string;
  supportEmail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RuntimeConfigService {
  private config: RuntimeAppConfig = {
    apiUrl: environment.apiUrl,
    appName: 'MediTrack',
    clinicName: 'MediTrack Clinical Operations',
    supportEmail: 'support@meditrack.local'
  };

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get appName(): string {
    return this.config.appName || 'MediTrack';
  }

  get clinicName(): string {
    return this.config.clinicName || 'MediTrack Clinical Operations';
  }

  get supportEmail(): string {
    return this.config.supportEmail || 'support@meditrack.local';
  }

  async load(): Promise<void> {
    try {
      const response = await fetch('/app-config.json', {
        cache: 'no-store'
      });

      if (!response.ok) {
        return;
      }

      const loaded = (await response.json()) as Partial<RuntimeAppConfig>;

      // Runtime config keeps Azure deployment edits out of the compiled bundles.
      this.config = {
        ...this.config,
        ...loaded,
        apiUrl: (loaded.apiUrl || this.config.apiUrl).replace(/\/$/, '')
      };
    } catch {
      // Keep the build-time fallback when the JSON file is not available.
    }
  }
}
