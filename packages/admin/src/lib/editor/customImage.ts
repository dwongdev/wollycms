import Image from '@tiptap/extension-image';

/** Rich-text image node with presentation attributes used by the admin editor. */
export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: (el: HTMLElement) => el.style.width || null },
      float: {
        default: 'none',
        parseHTML: (el: HTMLElement) => {
          if (el.style.marginLeft === 'auto' && el.style.marginRight === 'auto') return 'center';
          return el.style.float || el.getAttribute('data-float') || null;
        },
      },
      caption: { default: '', parseHTML: (el: HTMLElement) => el.getAttribute('data-caption') || null },
      href: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-href') || null },
      linkTarget: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-link-target') || null },
    };
  },
  renderHTML({ node }) {
    const { src, alt, title, width, float: imageFloat, caption, href, linkTarget } = node.attrs;
    const styles: string[] = [];
    if (width) styles.push(`width: ${width}`);
    if (imageFloat === 'center') {
      styles.push('display: block', 'margin-left: auto', 'margin-right: auto');
    } else if (imageFloat && imageFloat !== 'none') {
      styles.push(`float: ${imageFloat}`);
      styles.push(imageFloat === 'left' ? 'margin: 0 1rem 0.5rem 0' : 'margin: 0 0 0.5rem 1rem');
    }
    const attributes: Record<string, unknown> = {};
    if (src) attributes.src = src;
    if (alt) attributes.alt = alt;
    if (title) attributes.title = title;
    if (styles.length) attributes.style = styles.join('; ');
    if (caption) attributes['data-caption'] = caption;
    if (href) attributes['data-href'] = href;
    if (linkTarget) attributes['data-link-target'] = linkTarget;
    return ['img', attributes];
  },
});
