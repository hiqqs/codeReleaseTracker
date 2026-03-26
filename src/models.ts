export interface Repository {
  id: string;
  name: string;
  version: string;
  tag?: string;
}

export interface Release {
  id: string;
  name: string;
  date: string;
  description?: string;
  repositories: Repository[];
}
