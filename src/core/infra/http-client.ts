export interface HttpClient {
  get(url: string, options?: RequestInit): Promise<HttpResponse>;
}

export type HttpResponse = {
  status: number;
  json(): Promise<unknown>;
};

export class FetchHttpClient implements HttpClient {
  async get(url: string, options?: RequestInit): Promise<HttpResponse> {
    const response = await fetch(url, {
      method: "GET",
      ...options,
    });

    return {
      status: response.status,
      json: async () => response.json(),
    };
  }
}
