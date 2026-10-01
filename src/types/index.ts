export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
}

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  categories: Category[];
  mainNav: NavItem[];
  footerNav: {
    title: string;
    items: NavItem[];
  }[];
}
