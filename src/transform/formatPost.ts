import { format } from 'date-fns';
import { TumblrPost } from '../api/tumblr';

export interface GhostPost {
  id: number;
  title: string;
  slug: string;
  mobiledoc: string;
  feature_image?: string;
  featured: number;
  page: number;
  status: string;
  published_at: number;
  created_at: number;
  updated_at: number;
  created_by: number;
  updated_by: number;
  author_id: number;
}

export interface GhostTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface GhostUser {
  id: number;
  name: string;
  slug: string;
  email: string;
  profile_image?: string;
  cover_image?: string;
  bio?: string;
  website?: string;
  location?: string;
  facebook?: string;
  twitter?: string;
  accessibility?: string;
  status: string;
  meta_title?: string;
  meta_description?: string;
  tour?: string[];
  last_seen?: string;
  created_at: number;
  updated_at: number;
}

export interface GhostRole {
  id: number;
  name: string;
  description?: string;
  created_at: number;
  updated_at: number;
}

export interface PostTag {
  post_id: number;
  tag_id: number;
}

export interface PostAuthor {
  post_id: number;
  author_id: number;
}

export interface RoleUser {
  role_id: number;
  user_id: number;
}

export interface AuthorConfig {
  name: string;
  email: string;
  slug: string;
}

export class PostTransformer {
  private defaultAuthor: GhostUser;
  private authorId: number = 1;
  private tagIdCounter: number = 1;

  constructor(authorConfig?: AuthorConfig) {
    this.defaultAuthor = this.createDefaultAuthor(authorConfig);
  }

  transform(tumblrPost: TumblrPost): GhostPost {
    const createdAt = new Date(tumblrPost.timestamp * 1000);
    const updatedAt = new Date(tumblrPost.timestamp * 1000);
    
    return {
      id: parseInt(tumblrPost.id),
      title: this.extractTitle(tumblrPost),
      slug: this.generateSlug(tumblrPost),
      mobiledoc: this.convertToMobiledoc(tumblrPost),
      feature_image: this.extractFeatureImage(tumblrPost),
      featured: 0,
      page: 0,
      status: 'published',
      published_at: tumblrPost.timestamp * 1000,
      created_at: tumblrPost.timestamp * 1000,
      updated_at: tumblrPost.timestamp * 1000,
      created_by: this.authorId,
      updated_by: this.authorId,
      author_id: this.authorId,
    };
  }

  private extractTitle(tumblrPost: TumblrPost): string {
    if (tumblrPost.title) {
      return tumblrPost.title;
    }

    // Generate title based on post type and content
    switch (tumblrPost.type) {
      case 'text':
        return tumblrPost.body ? this.truncateText(tumblrPost.body, 60) : 'Untitled Post';
      case 'photo':
        return tumblrPost.photos?.[0]?.caption || 'Photo Post';
      case 'quote':
        return tumblrPost.quote_text ? this.truncateText(tumblrPost.quote_text, 60) : 'Quote Post';
      case 'link':
        return tumblrPost.title || 'Link Post';
      case 'chat':
        return 'Chat Post';
      case 'audio':
        return 'Audio Post';
      case 'video':
        return 'Video Post';
      case 'answer':
        return tumblrPost.question ? this.truncateText(tumblrPost.question, 60) : 'Answer Post';
      default:
        return 'Untitled Post';
    }
  }

  private convertToMobiledoc(tumblrPost: TumblrPost): string {
    const content = this.convertToHTML(tumblrPost);
    
    // Create a simple Mobiledoc structure
    // This is a basic Mobiledoc format - for production use, consider using @tryghost/migrate
    const mobiledoc = {
      version: '0.3.1',
      atoms: [],
      cards: [],
      markups: [],
      sections: [
        [1, 'p', [
          [0, [], 0, content]
        ]]
      ]
    };

    return JSON.stringify(mobiledoc);
  }

  private convertToHTML(tumblrPost: TumblrPost): string {
    switch (tumblrPost.type) {
      case 'text':
        return this.convertTextPost(tumblrPost);
      case 'photo':
        return this.convertPhotoPost(tumblrPost);
      case 'quote':
        return this.convertQuotePost(tumblrPost);
      case 'link':
        return this.convertLinkPost(tumblrPost);
      case 'chat':
        return this.convertChatPost(tumblrPost);
      case 'audio':
        return this.convertAudioPost(tumblrPost);
      case 'video':
        return this.convertVideoPost(tumblrPost);
      case 'answer':
        return this.convertAnswerPost(tumblrPost);
      default:
        return `<p>Unsupported post type: ${tumblrPost.type}</p>`;
    }
  }

  private convertTextPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.body) return '';
    
    // Convert Tumblr's HTML to clean HTML
    let html = tumblrPost.body;
    
    // Handle Tumblr's specific formatting
    html = html.replace(/<p><\/p>/g, ''); // Remove empty paragraphs
    html = html.replace(/<br\s*\/?>/g, '</p><p>'); // Convert <br> to paragraph breaks
    
    return html;
  }

  private convertPhotoPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.photos || tumblrPost.photos.length === 0) {
      return '<p>No photos found</p>';
    }

    let html = '';
    
    // Add caption if exists
    if (tumblrPost.photos[0].caption) {
      html += `<p>${tumblrPost.photos[0].caption}</p>`;
    }

    // Add photos
    for (const photo of tumblrPost.photos) {
      html += `<figure class="kg-card kg-image-card">`;
      html += `<img src="${photo.original_size.url}" alt="${photo.caption || ''}" />`;
      if (photo.caption) {
        html += `<figcaption>${photo.caption}</figcaption>`;
      }
      html += `</figure>`;
    }

    return html;
  }

  private convertQuotePost(tumblrPost: TumblrPost): string {
    let html = '<blockquote class="kg-blockquote-alt">';
    html += `<p>${tumblrPost.quote_text || ''}</p>`;
    if (tumblrPost.quote_source) {
      html += `<cite>— ${tumblrPost.quote_source}</cite>`;
    }
    html += '</blockquote>';
    return html;
  }

  private convertLinkPost(tumblrPost: TumblrPost): string {
    let html = '<div class="kg-card kg-bookmark-card">';
    html += `<a class="kg-bookmark-container" href="${tumblrPost.link_url || ''}">`;
    html += `<div class="kg-bookmark-content">`;
    html += `<div class="kg-bookmark-title">${tumblrPost.title || 'Link'}</div>`;
    if (tumblrPost.body) {
      html += `<div class="kg-bookmark-description">${tumblrPost.body}</div>`;
    }
    html += `<div class="kg-bookmark-metadata">`;
    html += `<div class="kg-bookmark-icon">🔗</div>`;
    html += `<div class="kg-bookmark-author">${tumblrPost.source_title || ''}</div>`;
    html += `</div>`;
    html += `</div>`;
    html += `</a>`;
    html += '</div>';
    return html;
  }

  private convertChatPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.chat) return '<p>No chat content</p>';

    let html = '<div class="kg-card kg-chat-card">';
    for (const message of tumblrPost.chat) {
      html += `<div class="kg-chat-message">`;
      html += `<span class="kg-chat-name">${message.name}:</span>`;
      html += `<span class="kg-chat-text">${message.phrase}</span>`;
      html += `</div>`;
    }
    html += '</div>';
    return html;
  }

  private convertAudioPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.audio_url) return '<p>No audio found</p>';

    let html = '<div class="kg-card kg-audio-card">';
    html += `<audio controls src="${tumblrPost.audio_url}"></audio>`;
    if (tumblrPost.body) {
      html += `<p>${tumblrPost.body}</p>`;
    }
    html += '</div>';
    return html;
  }

  private convertVideoPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.video_url) return '<p>No video found</p>';

    let html = '<div class="kg-card kg-video-card">';
    html += `<video controls src="${tumblrPost.video_url}"></video>`;
    if (tumblrPost.body) {
      html += `<p>${tumblrPost.body}</p>`;
    }
    html += '</div>';
    return html;
  }

  private convertAnswerPost(tumblrPost: TumblrPost): string {
    let html = '<div class="kg-card kg-answer-card">';
    if (tumblrPost.question) {
      html += `<div class="kg-answer-question"><strong>Q: ${tumblrPost.question}</strong></div>`;
    }
    if (tumblrPost.answer) {
      html += `<div class="kg-answer-answer"><strong>A: ${tumblrPost.answer}</strong></div>`;
    }
    html += '</div>';
    return html;
  }

  private extractFeatureImage(tumblrPost: TumblrPost): string | undefined {
    if (tumblrPost.photos && tumblrPost.photos.length > 0) {
      return tumblrPost.photos[0].original_size.url;
    }
    return undefined;
  }

  convertTags(tags: string[]): GhostTag[] {
    return tags.map(tag => ({
      id: this.tagIdCounter++,
      name: tag,
      slug: this.slugify(tag),
      description: undefined,
    }));
  }

  createDefaultAuthor(authorConfig?: AuthorConfig): GhostUser {
    const name = authorConfig?.name || 'Imported User';
    const email = authorConfig?.email || 'imported@example.com';
    const slug = authorConfig?.slug || 'imported-user';
    const now = Date.now();
    
    return {
      id: this.authorId,
      name,
      slug,
      email,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
  }

  createDefaultRole(): GhostRole {
    const now = Date.now();
    return {
      id: 1,
      name: 'Author',
      description: 'Authors',
      created_at: now,
      updated_at: now,
    };
  }

  createPostTags(posts: GhostPost[], tags: GhostTag[]): PostTag[] {
    const postTags: PostTag[] = [];
    
    for (const post of posts) {
      // For now, we'll link all posts to the first tag if any exist
      if (tags.length > 0) {
        postTags.push({
          post_id: post.id,
          tag_id: tags[0].id,
        });
      }
    }
    
    return postTags;
  }

  createPostAuthors(posts: GhostPost[]): PostAuthor[] {
    return posts.map(post => ({
      post_id: post.id,
      author_id: this.authorId,
    }));
  }

  createRoleUsers(): RoleUser[] {
    return [{
      role_id: 1,
      user_id: this.authorId,
    }];
  }

  private generateSlug(tumblrPost: TumblrPost): string {
    const title = this.extractTitle(tumblrPost);
    return this.slugify(title);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
} 