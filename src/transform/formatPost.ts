import { format } from 'date-fns';
import { TumblrPost } from '../api/tumblr';

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string;
  comment_id: string;
  feature_image?: string;
  featured: boolean;
  visibility: string;
  send_email_when_published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string;
  custom_excerpt?: string;
  codeinjection_head?: string;
  codeinjection_foot?: string;
  custom_template?: string;
  canonical_url?: string;
  tags: GhostTag[];
  authors: GhostAuthor[];
  primary_author: GhostAuthor;
  url: string;
  excerpt: string;
  reading_time: number;
  access: boolean;
  comments: boolean;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  twitter_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  meta_title?: string;
  meta_description?: string;
  email_subject?: string;
  frontmatter?: string;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  feature_image?: string;
  visibility: string;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  twitter_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  codeinjection_head?: string;
  codeinjection_foot?: string;
  canonical_url?: string;
  accent_color?: string;
  url: string;
}

export interface GhostAuthor {
  id: string;
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
  created_at: string;
  updated_at: string;
  roles: GhostRole[];
  url: string;
}

export interface GhostRole {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthorConfig {
  name: string;
  email: string;
  slug: string;
}

export class PostTransformer {
  private defaultAuthor: GhostAuthor;

  constructor(authorConfig?: AuthorConfig) {
    this.defaultAuthor = this.createDefaultAuthor(authorConfig);
  }

  transform(tumblrPost: TumblrPost): GhostPost {
    const postId = this.generateUUID();
    const createdAt = new Date(tumblrPost.timestamp * 1000);
    
    return {
      id: tumblrPost.id,
      uuid: postId,
      title: this.extractTitle(tumblrPost),
      slug: this.generateSlug(tumblrPost),
      html: this.convertToHTML(tumblrPost),
      comment_id: tumblrPost.id,
      feature_image: this.extractFeatureImage(tumblrPost),
      featured: false,
      visibility: 'public',
      send_email_when_published: false,
      created_at: format(createdAt, 'yyyy-MM-dd HH:mm:ss'),
      updated_at: format(createdAt, 'yyyy-MM-dd HH:mm:ss'),
      published_at: format(createdAt, 'yyyy-MM-dd HH:mm:ss'),
      custom_excerpt: this.extractExcerpt(tumblrPost),
      tags: this.convertTags(tumblrPost.tags),
      authors: [this.defaultAuthor],
      primary_author: this.defaultAuthor,
      url: this.generateUrl(tumblrPost),
      excerpt: this.extractExcerpt(tumblrPost) || '',
      reading_time: this.calculateReadingTime(tumblrPost),
      access: true,
      comments: true,
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

  private extractExcerpt(tumblrPost: TumblrPost): string | undefined {
    if (tumblrPost.body) {
      return this.truncateText(tumblrPost.body.replace(/<[^>]*>/g, ''), 160);
    }
    return undefined;
  }

  private convertTags(tags: string[]): GhostTag[] {
    return tags.map(tag => ({
      id: this.generateUUID(),
      name: tag,
      slug: this.slugify(tag),
      visibility: 'public',
      url: `/tag/${this.slugify(tag)}/`,
    }));
  }

  private createDefaultAuthor(authorConfig?: AuthorConfig): GhostAuthor {
    const name = authorConfig?.name || 'Imported User';
    const email = authorConfig?.email || 'imported@example.com';
    const slug = authorConfig?.slug || 'imported-user';
    
    return {
      id: this.generateUUID(),
      name,
      slug,
      email,
      status: 'active',
      created_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      updated_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      roles: [{
        id: this.generateUUID(),
        name: 'Author',
        created_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        updated_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      }],
      url: `/author/${slug}/`,
    };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSlug(tumblrPost: TumblrPost): string {
    const title = this.extractTitle(tumblrPost);
    return this.slugify(title);
  }

  private generateUrl(tumblrPost: TumblrPost): string {
    return `/posts/${this.generateSlug(tumblrPost)}/`;
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

  private calculateReadingTime(tumblrPost: TumblrPost): number {
    let text = '';
    
    if (tumblrPost.body) {
      text += tumblrPost.body.replace(/<[^>]*>/g, '');
    }
    
    if (tumblrPost.title) {
      text += ' ' + tumblrPost.title;
    }

    // Average reading speed: 200 words per minute
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }
} 