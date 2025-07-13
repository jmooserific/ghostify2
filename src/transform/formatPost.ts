import { format } from 'date-fns';
import { TumblrPost } from '../api/tumblr';
import { v4 as uuidv4 } from 'uuid';

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  mobiledoc: string | null;
  html: string | null;
  comment_id: string | null;
  feature_image: string | null;
  featured: number;
  type: string;
  status: string;
  locale: string | null;
  visibility: string;
  email_recipient_filter: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  custom_excerpt: string | null;
  codeinjection_head: string | null;
  codeinjection_foot: string | null;
  custom_template: string | null;
  canonical_url: string | null;
  newsletter_id: string | null;
  show_title_and_feature_image: number | null;
}

export interface AuthorConfig {
  name: string;
  email: string;
  slug: string;
}

// Mobiledoc interfaces for proper structure
interface MobiledocMarkup {
  tag: string;
  attributes?: Record<string, string>;
}

interface MobiledocAtom {
  name: string;
  text: string;
  payload: Record<string, any>;
}

interface MobiledocCard {
  name: string;
  payload: Record<string, any>;
}

interface MobiledocSection {
  type: number; // 1 = markup, 10 = image, 11 = card
  tag?: string;
  content?: any[];
  payload?: Record<string, any>;
}

interface Mobiledoc {
  version: string;
  atoms: MobiledocAtom[];
  cards: MobiledocCard[];
  markups: MobiledocMarkup[];
  sections: MobiledocSection[];
}

export class PostTransformer {
  private authorConfig?: AuthorConfig;

  constructor(authorConfig?: AuthorConfig) {
    this.authorConfig = authorConfig;
  }

  transform(tumblrPost: TumblrPost): GhostPost {
    const timestamp = new Date(tumblrPost.timestamp * 1000);
    const timestampString = timestamp.toISOString().replace('T', ' ').replace('Z', '');
    
    return {
      id: tumblrPost.id.toString(),
      uuid: uuidv4(),
      title: this.extractTitle(tumblrPost),
      slug: this.generateSlug(tumblrPost),
      mobiledoc: null, // Set to null as in the example
      html: this.convertToHtml(tumblrPost),
      comment_id: tumblrPost.id.toString(),
      feature_image: this.extractFeatureImage(tumblrPost),
      featured: 0,
      type: 'post',
      status: 'published',
      locale: null,
      visibility: 'public',
      email_recipient_filter: 'all',
      published_at: timestampString,
      created_at: timestampString,
      updated_at: timestampString,
      custom_excerpt: null,
      codeinjection_head: null,
      codeinjection_foot: null,
      custom_template: null,
      canonical_url: null,
      newsletter_id: null,
      show_title_and_feature_image: 1,
    };
  }

  private extractTitle(tumblrPost: TumblrPost): string {
    // Use the slug as title if available, otherwise generate from content
    if (tumblrPost.slug) {
      return this.humanizeSlug(tumblrPost.slug);
    }

    if (tumblrPost.title) {
      return tumblrPost.title;
    }

    // Generate title based on post type and content
    switch (tumblrPost.type) {
      case 'text':
        return tumblrPost.body ? this.truncateText(this.stripHtml(tumblrPost.body), 60) : 'Untitled Post';
      case 'photo':
        return 'Photo Post';
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

  private convertToHtml(tumblrPost: TumblrPost): string {
    // Process content based on post type
    switch (tumblrPost.type) {
      case 'text':
        return this.processTextPost(tumblrPost);
      case 'photo':
        return this.processPhotoPost(tumblrPost);
      case 'quote':
        return this.processQuotePost(tumblrPost);
      case 'link':
        return this.processLinkPost(tumblrPost);
      case 'chat':
        return this.processChatPost(tumblrPost);
      case 'audio':
        return this.processAudioPost(tumblrPost);
      case 'video':
        return this.processVideoPost(tumblrPost);
      case 'answer':
        return this.processAnswerPost(tumblrPost);
      default:
        return `<p>Unsupported post type: ${tumblrPost.type}</p>`;
    }
  }

  private processTextPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.body) {
      return '<p></p>';
    }

    // Extract images from the HTML
    const images = this.extractImagesFromHtml(tumblrPost.body);
    
    // Extract text content
    const textContent = this.extractTextFromHtml(tumblrPost.body);
    
    let html = '';
    
    // If we have images, process them as a photo post
    if (images.length > 0) {
      // Add text content first if it exists
      if (textContent.trim()) {
        html += textContent;
      }
      
      // Add each image
      for (const imageUrl of images) {
        html += `<img src="${imageUrl}" alt="" />`;
      }
    } else {
      // No images, process as regular text
      html = this.cleanHtml(tumblrPost.body);
    }
    
    return html || '<p></p>';
  }

  private processPhotoPost(tumblrPost: TumblrPost): string {
    let html = '';
    
    // Extract images from the body HTML if it exists
    const images = this.extractImagesFromHtml(tumblrPost.body || '');
    
    // Add text content before images if it exists
    const textContent = this.extractTextFromHtml(tumblrPost.body || '');
    if (textContent.trim()) {
      html += textContent;
    }

    // Add each image
    for (const imageUrl of images) {
      html += `<img src="${imageUrl}" alt="" />`;
    }
    
    return html || '<p></p>';
  }

  private processQuotePost(tumblrPost: TumblrPost): string {
    const quoteText = tumblrPost.quote_text || '';
    const quoteSource = tumblrPost.quote_source || '';
    
    let html = '<blockquote>';
    html += `<p>${this.escapeHtml(quoteText)}</p>`;
    if (quoteSource) {
      html += `<cite>— ${this.escapeHtml(quoteSource)}</cite>`;
    }
    html += '</blockquote>';
    
    return html;
  }

  private processLinkPost(tumblrPost: TumblrPost): string {
    const title = tumblrPost.title || 'Link';
    const url = tumblrPost.link_url || '';
    const description = tumblrPost.body || '';
    
    let html = '<div class="link-post">';
    html += `<h3><a href="${url}">${this.escapeHtml(title)}</a></h3>`;
    if (description) {
      html += `<p>${this.cleanHtml(description)}</p>`;
    }
    html += '</div>';
    
    return html;
  }

  private processChatPost(tumblrPost: TumblrPost): string {
    if (!tumblrPost.chat || tumblrPost.chat.length === 0) {
      return '<p>No chat content</p>';
    }

    let html = '<div class="chat-post">';
    for (const message of tumblrPost.chat) {
      html += '<div class="chat-message">';
      html += `<span class="chat-name">${this.escapeHtml(message.name)}:</span>`;
      html += `<span class="chat-text">${this.escapeHtml(message.phrase)}</span>`;
      html += '</div>';
    }
    html += '</div>';
    
    return html;
  }

  private processAudioPost(tumblrPost: TumblrPost): string {
    let html = '';
    
    if (tumblrPost.audio_url) {
      html += `<audio controls><source src="${tumblrPost.audio_url}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;
    } else {
      html += '<p>No audio found</p>';
    }

    // Add any text content
    if (tumblrPost.body) {
      html += this.cleanHtml(tumblrPost.body);
    }
    
    return html;
  }

  private processVideoPost(tumblrPost: TumblrPost): string {
    let html = '';
    
    if (tumblrPost.video_url) {
      html += `<video controls><source src="${tumblrPost.video_url}" type="video/mp4">Your browser does not support the video element.</video>`;
    } else {
      html += '<p>No video found</p>';
    }

    // Add any text content
    if (tumblrPost.body) {
      html += this.cleanHtml(tumblrPost.body);
    }
    
    return html;
  }

  private processAnswerPost(tumblrPost: TumblrPost): string {
    let html = '<div class="answer-post">';
    
    if (tumblrPost.question) {
      html += `<div class="question"><strong>Q: ${this.escapeHtml(tumblrPost.question)}</strong></div>`;
    }
    
    if (tumblrPost.answer) {
      html += `<div class="answer"><strong>A: ${this.escapeHtml(tumblrPost.answer)}</strong></div>`;
    }
    
    html += '</div>';
    
    return html;
  }

  private extractImagesFromHtml(html: string): string[] {
    const images: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src && !src.startsWith('data:')) {
        images.push(src);
      }
    }
    
    return images;
  }

  private extractTextFromHtml(html: string): string {
    // Remove all img tags and their content
    let text = html.replace(/<img[^>]*>/gi, '');
    
    // Clean up any remaining HTML
    text = this.cleanHtml(text);
    
    return text.trim();
  }

  private cleanHtml(html: string): string {
    // Remove Tumblr-specific classes and attributes
    html = html.replace(/class="[^"]*"/g, '');
    html = html.replace(/data-[^=]*="[^"]*"/g, '');
    html = html.replace(/srcset="[^"]*"/g, '');
    html = html.replace(/sizes="[^"]*"/g, '');
    
    // Clean up empty elements
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<div><\/div>/g, '');
    
    // Normalize whitespace
    html = html.replace(/\s+/g, ' ');
    
    return html.trim();
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private extractFeatureImage(tumblrPost: TumblrPost): string | null {
    // Try to extract the first image from the body
    if (tumblrPost.body) {
      const images = this.extractImagesFromHtml(tumblrPost.body);
      if (images.length > 0) {
        return images[0];
      }
    }
    
    // Fallback to photos array if available
    if (tumblrPost.photos && tumblrPost.photos.length > 0) {
      return tumblrPost.photos[0].original_size.url;
    }
    
    return null;
  }

  private humanizeSlug(slug: string): string {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  private generateSlug(tumblrPost: TumblrPost): string {
    // Use the existing slug if available
    if (tumblrPost.slug) {
      return tumblrPost.slug;
    }
    
    // Otherwise generate from title
    const title = this.extractTitle(tumblrPost);
    return this.slugify(title);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
} 