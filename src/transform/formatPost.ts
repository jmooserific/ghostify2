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

// Standalone utility function to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
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
    // 1. Use the Tumblr title field (if present)
    if (tumblrPost.title && tumblrPost.title.trim()) {
      return tumblrPost.title.trim();
    }

    // 2. If no title, use the first sentence or 6–12 words of the post body text
    if (tumblrPost.body && tumblrPost.body.trim()) {
      const plainText = stripHtml(tumblrPost.body);
      const decodedText = this.decodeHtmlEntities(plainText);
      
      // Try to get the first sentence
      const firstSentence = this.extractFirstSentence(decodedText);
      if (firstSentence && firstSentence.length > 10) {
        return firstSentence;
      }
      
      // If no good sentence, get first 8-10 words
      const firstWords = this.extractFirstWords(decodedText, 10);
      if (firstWords && firstWords.length > 5) {
        return firstWords;
      }
    }

    // 3. If body is empty or minimal, fall back to post slug
    if (tumblrPost.slug && tumblrPost.slug.trim()) {
      const humanizedSlug = this.humanizeSlug(tumblrPost.slug);
      const truncatedSlug = this.truncateToWords(humanizedSlug, 12);
      if (truncatedSlug.length > 5) {
        return truncatedSlug;
      }
    }

    // 4. Fallback: Use formatted post date
    const timestamp = new Date(tumblrPost.timestamp * 1000);
    const dateString = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
    return `Post from ${dateString}`;
  }

  // Helper to convert Tumblr gallery HTML to Ghost gallery HTML
  private convertTumblrGalleryToGhostGallery(body: string): string {
    // More robust regex: match <div ... class="...npf_row..." ...> ... </div>
    const rowRegex = /<div[^>]*class=["'][^"']*npf_row[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    const galleryRows: string[][] = [];
    let lastIndex = 0;
    let galleryFound = false;
    let galleryStart = -1;
    let rowCount = 0;

    // Find all rows and extract image srcs, preserving row structure
    while ((match = rowRegex.exec(body)) !== null) {
      if (!galleryFound) galleryStart = match.index;
      galleryFound = true;
      rowCount++;
      const rowHtml = match[1];
      // Find all <img ...> in this row, regardless of nesting
      const imgRegex = /<img [^>]*src=["']([^"']+)["'][^>]*>/gi;
      let imgMatch;
      const rowImages: string[] = [];
      while ((imgMatch = imgRegex.exec(rowHtml)) !== null) {
        rowImages.push(imgMatch[1]);
      }
      if (rowImages.length > 0) {
        galleryRows.push(rowImages);
      }
      lastIndex = rowRegex.lastIndex;
    }

    // Debug: log the number of rows found for this post
    if (galleryFound) {
      // eslint-disable-next-line no-console
      console.log(`[Ghostify] Found ${rowCount} gallery rows in post body.`);
    }

    // Build Ghost gallery HTML if we found a gallery
    let galleryHtml = '';
    if (galleryFound && galleryRows.length > 0) {
      // Ghost galleries require 2-3 images per row, so we need to combine single-image rows
      const ghostRows: string[][] = [];
      let currentRow: string[] = [];
      
      for (const tumblrRow of galleryRows) {
        // Add all images from this Tumblr row to our current Ghost row
        currentRow.push(...tumblrRow);
        
        // If we have 2 or 3 images, create a Ghost row
        if (currentRow.length >= 2 && currentRow.length <= 3) {
          ghostRows.push([...currentRow]);
          currentRow = [];
        }
        // If we have more than 3 images, split into multiple rows
        else if (currentRow.length > 3) {
          // Take first 3 images for this row
          ghostRows.push(currentRow.slice(0, 3));
          // Keep remaining images for next row
          currentRow = currentRow.slice(3);
        }
        // If we have 1 image, continue to next Tumblr row to try to get more images
      }
      
      // Handle any remaining images (should be 0 or 1)
      if (currentRow.length === 1) {
        // Single image left - add it to the last row if it has 2 images, otherwise let Ghost handle it
        if (ghostRows.length > 0 && ghostRows[ghostRows.length - 1].length === 2) {
          ghostRows[ghostRows.length - 1].push(currentRow[0]);
        } else {
          // Let Ghost handle the single image naturally
          ghostRows.push([currentRow[0]]);
        }
      }
      
      // Build the HTML
      galleryHtml += '<figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container">';
      for (const row of ghostRows) {
        galleryHtml += '<div class="kg-gallery-row">';
        for (const imgSrc of row) {
          galleryHtml += `<div class="kg-gallery-image"><img src="${imgSrc}" loading="lazy" alt="" /></div>`;
        }
        galleryHtml += '</div>';
      }
      galleryHtml += '</div></figure>';
    }

    // Extract text before the first gallery (if any)
    let textBefore = '';
    if (galleryFound && galleryStart > 0) {
      textBefore = body.slice(0, galleryStart);
    } else if (!galleryFound) {
      textBefore = body;
    }

    // Extract text after the last gallery (if any)
    let textAfter = '';
    if (galleryFound && lastIndex < body.length) {
      textAfter = body.slice(lastIndex);
    }

    // Compose final HTML
    let html = '';
    if (textBefore.trim()) html += textBefore;
    if (galleryHtml) html += galleryHtml;
    if (textAfter.trim()) html += textAfter;
    return html || '<p></p>';
  }

  private convertToHtml(tumblrPost: TumblrPost): string {
    // Treat all posts the same: convert galleries, preserve rest of HTML
    const body = tumblrPost.body || '';
    return this.convertTumblrGalleryToGhostGallery(body);
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
    return text.trim();
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

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&hellip;': '...',
      '&mdash;': '—',
      '&ndash;': '–',
      '&lsquo;': "'",
      '&rsquo;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"'
    };
    
    return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
      return entities[match] || match;
    });
  }

  private extractFirstSentence(text: string): string {
    // Remove extra whitespace and normalize
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // Look for sentence endings: . ! ? followed by space or end of string
    const sentenceMatch = cleanText.match(/^[^.!?]*[.!?](?:\s|$)/);
    if (sentenceMatch) {
      const sentence = sentenceMatch[0].trim();
      // Ensure it's not too short (likely not a real sentence)
      if (sentence.length > 10 && sentence.split(' ').length > 3) {
        return sentence;
      }
    }
    
    return '';
  }

  private extractFirstWords(text: string, maxWords: number): string {
    // Remove extra whitespace and normalize
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // Split into words and take the first maxWords
    const words = cleanText.split(/\s+/).slice(0, maxWords);
    
    // Filter out very short words (likely not meaningful)
    const meaningfulWords = words.filter(word => word.length > 1);
    
    if (meaningfulWords.length >= 3) {
      return meaningfulWords.join(' ');
    }
    
    return '';
  }

  private truncateToWords(text: string, maxWords: number): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
      return text;
    }
    
    return words.slice(0, maxWords).join(' ');
  }
} 