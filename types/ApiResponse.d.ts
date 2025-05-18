export interface ApiResponse {
  ok: boolean;
  status: number;
  data: any;
  headers: Record<string, string>;
}

export default ApiResponse;
