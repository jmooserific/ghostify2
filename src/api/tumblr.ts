import axios, { AxiosInstance } from 'axios';
import { format } from 'date-fns';

export interface TumblrPost {
  id: string;
  type: string;
  timestamp: number;
  date: string;
  format: string;
  reblog_key: string;
  tags: string[];
  bookmarklet: boolean;
  mobile: boolean;
  source_url: string;
  source_title: string;
  liked: boolean;
  state: string;
  total_posts: number;
  note_count: number;
  title?: string;
  body?: string;
  photos?: Array<{
    caption: string;
    original_size: {
      url: string;
      width: number;
      height: number;
    };
    alt_sizes: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  }>;
  video_url?: string;
  audio_url?: string;
  link_url?: string;
  quote_text?: string;
  quote_source?: string;
  answer?: string;
  question?: string;
  chat?: Array<{
    name: string;
    label: string;
    phrase: string;
  }>;
}

export interface TumblrResponse {
  meta: {
    status: number;
    msg: string;
  };
  response: {
    blog: {
      title: string;
      name: string;
      total_posts: number;
      updated: number;
      description: string;
      url: string;
      is_nsfw: boolean;
      is_adult: boolean;
      can_be_followed: boolean;
      share_likes: boolean;
      share_following: boolean;
      can_send_fan_mail: boolean;
      subscribed: boolean;
      can_subscribe: boolean;
      is_blocked_from_primary: boolean;
      post_views: number;
      location: string;
      avatar: Array<{
        width: number;
        height: number;
        url: string;
      }>;
      theme: {
        avatar_shape: string;
        background_color: string;
        body_font: string;
        header_bounds: string;
        header_image: string;
        header_image_focused: string;
        header_image_scaled: string;
        header_stretch: boolean;
        link_color: string;
        show_avatar: boolean;
        show_description: boolean;
        show_header_image: boolean;
        show_title: boolean;
        title_color: string;
        title_font: string;
        title_font_weight: string;
      };
    };
    posts: TumblrPost[];
    total_posts: number;
    _links: {
      next: {
        href: string;
        method: string;
        query_params: {
          before: number;
        };
      };
    };
  };
}

export interface FetchOptions {
  limit?: number;
  includePrivate?: boolean;
  before?: number;
}

export class TumblrAPI {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.tumblr.com/v2',
      timeout: 30000,
    });
  }

  async fetchAllPosts(blogName: string, options: FetchOptions = {}): Promise<TumblrPost[]> {
    const { limit = 1000, includePrivate = false } = options;
    const posts: TumblrPost[] = [];
    let before: number | undefined;
    let totalFetched = 0;

    while (totalFetched < limit) {
      try {
        const response = await this.fetchPosts(blogName, {
          limit: Math.min(20, limit - totalFetched), // Tumblr API limit is 20 per request
          before,
          includePrivate,
        });

        if (!response.response.posts || response.response.posts.length === 0) {
          break;
        }

        posts.push(...response.response.posts);
        totalFetched += response.response.posts.length;

        // Check if there are more posts
        if (response.response._links?.next?.query_params?.before) {
          before = response.response._links.next.query_params.before;
        } else {
          break;
        }

        // Rate limiting - be respectful to Tumblr's API
        await this.delay(1000);

      } catch (error) {
        console.error(`Error fetching posts: ${error}`);
        break;
      }
    }

    return posts;
  }

  private async fetchPosts(blogName: string, options: FetchOptions = {}): Promise<TumblrResponse> {
    const { limit = 20, before, includePrivate = false } = options;
    
    const params: Record<string, any> = {
      api_key: this.apiKey,
      limit,
    };

    if (before) {
      params.before = before;
    }

    if (includePrivate) {
      // Note: Private posts require OAuth tokens
      params.filter = 'raw';
    }

    const response = await this.client.get(`/blog/${blogName}/posts`, { params });
    
    if (response.data.meta.status !== 200) {
      throw new Error(`Tumblr API error: ${response.data.meta.msg}`);
    }

    return response.data;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getBlogInfo(blogName: string): Promise<TumblrResponse['response']['blog']> {
    const response = await this.client.get(`/blog/${blogName}/info`, {
      params: { api_key: this.apiKey },
    });

    if (response.data.meta.status !== 200) {
      throw new Error(`Tumblr API error: ${response.data.meta.msg}`);
    }

    return response.data.response.blog;
  }
} 