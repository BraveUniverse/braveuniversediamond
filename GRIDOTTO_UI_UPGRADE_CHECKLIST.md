# 🎯 Gridotto UI Upgrade Checklist & Implementation Guide

## 📋 Overview
This document provides a step-by-step guide to upgrade the existing Gridotto UI to support the new Diamond contract features while maintaining the current design aesthetic.

---

## 🎨 Design Principles
- **Keep existing color scheme**: Pink (#FF2975) as primary
- **Maintain current layout structure**
- **Add new features without disrupting existing UX**
- **Progressive enhancement approach**

---

## ✅ Phase 1: Contract Integration Updates

### 1.1 Update Contract Configuration
- [ ] **File**: `src/config/contracts.ts`
- [ ] **Action**: Update contract addresses and add new facet addresses
- [ ] **Prompt**: "Update the contract configuration file to include Diamond proxy address and all facet addresses (GridottoFacet, Phase3Facet, Phase4Facet, AdminFacet)"

```typescript
// Example structure
export const CONTRACTS = {
  DIAMOND: "0x5Ad808FAE645BA3682170467114e5b80A70bF276",
  GRIDOTTO_FACET: "0x...",
  PHASE3_FACET: "0x71E30D0055d57C796EB9F9fB94AD128B4C377F9B",
  PHASE4_FACET: "0xfF7A397d8d33f66C8cf4417D6D355CdBF62D482b",
  ADMIN_FACET: "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D"
}
```

### 1.2 Update ABI Files
- [ ] **File**: Create `src/abis/` directory
- [ ] **Action**: Add all facet ABIs
- [ ] **Prompt**: "Create ABI files for each facet: GridottoFacet.json, GridottoPhase3Facet.json, GridottoPhase4Facet.json, AdminFacet.json"

### 1.3 Update Contract Hook
- [ ] **File**: `src/hooks/useGridottoContract.tsx`
- [ ] **Action**: Modify to support multiple facets
- [ ] **Prompt**: "Update the contract hook to call different facets based on function type. Add methods for Phase3 (token/NFT draws) and Phase4 (multi-winner) features"

---

## ✅ Phase 2: Navigation & Layout Updates

### 2.1 Update Navigation Menu
- [ ] **File**: `src/components/layout/Navigation.tsx`
- [ ] **Action**: Add new menu items
- [ ] **Prompt**: "Add these menu items to the navigation: 'Create Draw', 'Token Draws', 'NFT Draws'. Keep the existing pink hover effects"

```tsx
// New menu items to add:
{ label: 'Create Draw', href: '/create-draw', icon: 'plus' }
{ label: 'All Draws', href: '/draws', icon: 'grid' }
{ label: 'My Draws', href: '/my-draws', icon: 'user' }
```

### 2.2 Update Homepage Hero Section
- [ ] **File**: `src/app/page.tsx`
- [ ] **Action**: Add feature buttons to hero
- [ ] **Prompt**: "In the hero section after the main title, add three feature buttons: 'Create Your Draw' (green accent), 'Browse Token Draws' (blue accent), 'Browse NFT Draws' (purple accent). Use the existing button styles but with new accent colors"

---

## ✅ Phase 3: New Pages Creation

### 3.1 Create Draw Page
- [ ] **File**: `src/app/create-draw/page.tsx`
- [ ] **Action**: Create multi-step wizard
- [ ] **Prompt**: "Create a 5-step wizard page for draw creation. Use existing card components and form styles. Steps: 1) Select Type (LYX/Token/NFT), 2) Prize Configuration, 3) Draw Settings, 4) Requirements, 5) Review & Create"

### 3.2 Browse Draws Page
- [ ] **File**: `src/app/draws/page.tsx`
- [ ] **Action**: Create filterable grid layout
- [ ] **Prompt**: "Create a browse page with filters sidebar (left) and draws grid (right). Reuse the existing lottery card design but add badges for draw types (TOKEN/NFT/MULTI-WINNER)"

### 3.3 Draw Details Page
- [ ] **File**: `src/app/draw/[id]/page.tsx`
- [ ] **Action**: Create detailed view
- [ ] **Prompt**: "Create draw details page with tabs: Overview, Participants, Rules. Use existing tab component styles. Add real-time participant counter"

### 3.4 My Draws Page
- [ ] **File**: `src/app/my-draws/page.tsx`
- [ ] **Action**: User's created draws
- [ ] **Prompt**: "Create a dashboard showing user's created draws and participated draws in separate tabs. Include stats cards at top"

---

## ✅ Phase 4: Component Updates

### 4.1 Draw Card Component Enhancement
- [ ] **File**: `src/components/draws/DrawCard.tsx`
- [ ] **Action**: Add type badges and multi-winner display
- [ ] **Prompt**: "Enhance the existing lottery card to show: draw type badge (TOKEN/NFT/LYX), creator info, multi-winner tiers if applicable. Keep the pink gradient border"

### 4.2 Create Token Selector Component
- [ ] **File**: `src/components/draws/TokenSelector.tsx`
- [ ] **Action**: LSP7 token selection modal
- [ ] **Prompt**: "Create a modal component for selecting LSP7 tokens. Show user's token balances with icons. Use existing modal styles"

### 4.3 Create NFT Selector Component
- [ ] **File**: `src/components/draws/NFTSelector.tsx`
- [ ] **Action**: LSP8 NFT grid selector
- [ ] **Prompt**: "Create NFT selector with grid layout showing NFT images. Add checkbox overlay for selection. Use existing grid styles"

### 4.4 Multi-Winner Configuration Component
- [ ] **File**: `src/components/draws/MultiWinnerConfig.tsx`
- [ ] **Action**: Tier configuration interface
- [ ] **Prompt**: "Create tier configuration component with add/remove tier buttons. Each tier shows: position, winner count, prize percentage. Use existing form styles"

---

## ✅ Phase 5: Profile Page Enhancements

### 5.1 Add Draws Tab to Profile
- [ ] **File**: `src/app/profile/[address]/page.tsx`
- [ ] **Action**: Add new tabs
- [ ] **Prompt**: "Add 'Created Draws' and 'Won Prizes' tabs to the existing profile tabs. Keep the current tab styling"

### 5.2 Prize Claim Section
- [ ] **File**: `src/components/profile/PrizeClaim.tsx`
- [ ] **Action**: Claimable prizes display
- [ ] **Prompt**: "Create a prize claim section showing pending LYX, tokens, and NFTs. Add claim buttons with loading states. Use existing button styles"

---

## ✅ Phase 6: Admin Dashboard (Owner Only)

### 6.1 Create Admin Route
- [ ] **File**: `src/app/admin/page.tsx`
- [ ] **Action**: Admin dashboard
- [ ] **Prompt**: "Create admin dashboard with stats cards, user management table, and platform settings. Use existing card and table components"

### 6.2 Admin Components
- [ ] **Files**: `src/components/admin/`
- [ ] **Action**: Create admin-specific components
- [ ] **Prompt**: "Create these admin components: StatsOverview, UserManagement, FeeConfiguration, EmergencyControls. Maintain consistent styling"

---

## ✅ Phase 7: API Integration

### 7.1 Create API Routes
- [ ] **Files**: `src/app/api/draws/`, `src/app/api/users/`
- [ ] **Action**: Backend API endpoints
- [ ] **Prompt**: "Create Next.js API routes for: fetching draws with filters, creating draws, fetching user data, admin functions"

### 7.2 Add Data Fetching Hooks
- [ ] **Files**: `src/hooks/useDraws.ts`, `src/hooks/useUserData.ts`
- [ ] **Action**: React Query hooks
- [ ] **Prompt**: "Create React Query hooks for data fetching with caching, pagination, and real-time updates"

---

## ✅ Phase 8: UI Polish & Animations

### 8.1 Add Loading States
- [ ] **Action**: Skeleton loaders
- [ ] **Prompt**: "Add skeleton loaders for all data-fetching components. Use shimmer effect with the existing gray color palette"

### 8.2 Add Success Animations
- [ ] **Action**: Celebration effects
- [ ] **Prompt**: "Add confetti animation for successful draw creation and prize claims. Use pink and gold colors"

### 8.3 Mobile Responsiveness
- [ ] **Action**: Test and fix mobile views
- [ ] **Prompt**: "Ensure all new components are mobile responsive. Filters should collapse to bottom sheet on mobile"

---

## ✅ Phase 9: Testing & Deployment

### 9.1 Component Testing
- [ ] **Action**: Write tests
- [ ] **Prompt**: "Write unit tests for new components using existing test setup"

### 9.2 Integration Testing
- [ ] **Action**: Test user flows
- [ ] **Prompt**: "Test complete user flows: create draw, buy ticket, claim prize"

### 9.3 Performance Optimization
- [ ] **Action**: Optimize bundle size
- [ ] **Prompt**: "Lazy load heavy components, optimize images, add proper caching headers"



## 📝 Code Style Guidelines

### Maintain Existing Patterns:
```tsx
// Component structure
export const ComponentName = () => {
  // Hooks first
  const { data } = useHook();
  
  // State management
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {}, []);
  
  // Handlers
  const handleAction = () => {};
  
  // Render
  return <div className="existing-styles">...</div>;
};

// Styling approach
- Use Tailwind classes
- Keep existing color variables
- Maintain 8px spacing system
- Preserve border-radius values
```

---

## 🎨 New Feature Styling Guide

### Color Additions (for badges only):
```css
/* Keep existing pink theme, add these for badges */
--badge-token: #3B82F6;    /* Blue for token draws */
--badge-nft: #8B5CF6;      /* Purple for NFT draws */
--badge-multi: #10B981;    /* Green for multi-winner */
--badge-admin: #F59E0B;    /* Amber for admin */
```

### Component Patterns:
```tsx
// Badge component
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
  TOKEN
</span>

// Keep existing card hover effects
<div className="transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
  ...
</div>
```

---

## 🔧 Development Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Check TypeScript
npm run type-check

# Lint code
npm run lint
```

---

## 📋 Pre-Deployment Checklist

- [ ] All contract addresses updated
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Mobile responsiveness verified
- [ ] Loading states implemented
- [ ] Error handling added
- [ ] Analytics events tracked
- [ ] SEO metadata updated
- [ ] Performance benchmarks met
- [ ] Security headers configured

---

## 🎯 Success Metrics

- Page load time < 3s
- Time to Interactive < 5s
- Mobile score > 90 (Lighthouse)
- Zero console errors
- All features accessible via keyboard
- WCAG AA compliance maintained

---

## 📞 Support & Resources

- Diamond Contract Docs: `/docs/technical/`
- UI Component Library: Existing components in `/src/components/`
- Design System: Maintain current Tailwind config
- Testing Guide: Follow existing test patterns

---

**Remember**: The goal is to add new functionality while preserving the familiar Gridotto experience users love!