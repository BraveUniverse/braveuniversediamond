# 🎯 Gridotto UI - Detailed Implementation Prompts

## 1. Contract Integration Prompts

### Update useGridottoContract Hook
```
Prompt: "I need to update the useGridottoContract hook to support multiple facets. The hook should:

1. Keep all existing methods for backward compatibility
2. Add new methods that call different facets:
   - Phase3Facet for: createTokenDraw, createNFTDraw, buyTokenDrawTicket, claimTokenPrize, claimNFTPrize
   - Phase4Facet for: createAdvancedDraw, getDrawTiers
   - AdminFacet for: setFees, banUser, withdrawProfit

The hook should determine which facet to use based on the method being called. Use the existing Web3 instance and error handling patterns.

Example structure:
const createTokenDraw = async (params) => {
  const phase3Contract = new web3.eth.Contract(PHASE3_ABI, PHASE3_ADDRESS);
  return await phase3Contract.methods.createTokenDraw(...).send({ from: account });
}"
```

---

## 2. Create Draw Wizard Implementation

### Step 1: Draw Type Selection
```
Prompt: "Create a draw type selection component with 3 cards:

1. LYX Draw - Use existing pink gradient, icon: coins
2. Token Draw - Blue accent (#3B82F6), icon: token/circle
3. NFT Draw - Purple accent (#8B5CF6), icon: image/frame

Each card should:
- Have hover effect (scale 1.02, shadow)
- Show description text
- Be clickable to proceed to next step
- Use existing card component styles

Layout: 3 columns on desktop, 1 column on mobile"
```

### Step 2: Prize Configuration
```
Prompt: "Create prize configuration form based on selected type:

For LYX Draw:
- Input field for prize amount in LYX
- Show USD equivalent below

For Token Draw:
- Token selector button (opens modal)
- Selected token display with icon
- Amount input field
- User's balance display

For NFT Draw:
- NFT collection selector
- Grid of user's NFTs with checkbox selection
- Selected NFT preview

Use existing form styles, pink focus states, and validation patterns"
```

### Step 3: Multi-Winner Configuration
```
Prompt: "Create a tier configuration component:

- Toggle switch: 'Enable Multiple Winners'
- When enabled, show tier list
- Each tier has: position badge, winner count input, percentage input
- Add/Remove tier buttons
- Auto-calculate remaining percentage
- Validation: percentages must sum to 100%

Visual: Use cards for each tier, pink accent for active tier"
```

---

## 3. Browse Draws Page

### Filter Sidebar
```
Prompt: "Create a filter sidebar component:

Sections:
1. Draw Type (checkboxes)
   - Official Platform Draws
   - User LYX Draws  
   - Token Draws
   - NFT Draws

2. Status
   - Active
   - Ended
   - My Participated

3. Prize Range (slider)
   - Min/Max in LYX equivalent

4. Requirements
   - No VIP Required
   - No Following Required

Style: White background, subtle borders, pink accents for selected items
Mobile: Convert to bottom sheet with 'Filters' button"
```

### Draw Grid
```
Prompt: "Update existing lottery card component to show:

1. Type badge (top-right corner)
   - TOKEN (blue), NFT (purple), MULTI (green)
   
2. Creator info (below title)
   - Small avatar + username
   
3. Multi-winner indicator (if applicable)
   - Show tier count: '3 Winners'
   
4. Progress bar for participation
   - Current/Max participants

Keep: Pink gradient border on hover, existing animations"
```

---

## 4. Token/NFT Selector Components

### Token Selector Modal
```
Prompt: "Create a modal for LSP7 token selection:

Header: 'Select Token' with close button
Content:
- Search input at top
- List of tokens with:
  - Token icon (fallback to first letter)
  - Token name and symbol
  - User's balance
  - Select button

Selected state: Pink background, white text
Empty state: 'No tokens found' message
Loading: Skeleton loaders

Use existing modal backdrop and animation"
```

### NFT Grid Selector
```
Prompt: "Create NFT selection grid:

- 3 columns on desktop, 2 on mobile
- Each NFT card shows:
  - NFT image (square aspect ratio)
  - Collection name (small text)
  - Token ID
  - Checkbox overlay (top-right)

Selected state: Pink border, slight scale
Hover: Lift effect with shadow
Loading: Pulse animation on placeholder cards"
```

---

## 5. Profile Page Enhancements

### Created Draws Tab
```
Prompt: "Add a new tab to profile page showing user's created draws:

Stats row at top:
- Total Draws Created
- Total Participants  
- Total Prize Distributed
- Active Draws

Draws list below:
- Use existing card component
- Add status badge (Active/Ended)
- Show participant count
- Edit/Cancel buttons for active draws

Empty state: 'No draws created yet' with CTA button"
```

### Prize Claim Section
```
Prompt: "Create prize claim interface:

Pending Prizes Card:
- LYX amount with claim button
- List of tokens with amounts
- Grid of NFT prizes

Each item shows:
- Prize details
- Draw name it came from
- Claim button (or 'Claiming...' state)

Success state: Confetti animation, success message
Use existing button styles and loading spinners"
```

---

## 6. Admin Dashboard

### Main Dashboard
```
Prompt: "Create admin dashboard (only visible to contract owner):

Top stats cards (4 columns):
- Total Volume
- Platform Fees Earned  
- Active Users
- Active Draws

Below sections:
1. Recent Activity (table)
2. User Management (searchable table)
3. Platform Settings (form)
4. Quick Actions (buttons)

Style: Use existing card components, tables, and form elements
Add amber accent color for admin-only elements"
```

### Emergency Controls
```
Prompt: "Create emergency controls panel:

- Pause/Unpause Contract (big toggle)
- Force Draw Execution (list of pending draws)
- Withdraw Fees button
- Clear Stuck Draws

Each action should:
- Have confirmation modal
- Show estimated gas
- Log to activity table

Style: Red accents for dangerous actions, existing button styles"
```

---

## 7. Mobile Responsive Updates

### Navigation Drawer
```
Prompt: "Update mobile navigation to include new menu items:

- Add 'Create Draw' with plus icon
- Add 'All Draws' section
- Keep existing styling and animations
- Bottom tab bar: Add 'Create' button (center, pink circle)"
```

### Mobile Create Flow
```
Prompt: "Adapt create draw wizard for mobile:

- Full screen steps
- Bottom navigation: Back/Next buttons
- Step indicator at top (dots)
- Swipe gestures between steps
- Form inputs: Full width, larger touch targets"
```

---

## 8. Real-time Updates

### WebSocket Integration
```
Prompt: "Add real-time updates using WebSocket:

Events to handle:
- New participant joined
- Draw ended
- Prize claimed
- New draw created

Updates should:
- Smoothly animate counter changes
- Show toast notifications
- Update UI without full refresh

Keep existing animation patterns"
```

---

## 9. Loading & Error States

### Skeleton Loaders
```
Prompt: "Create skeleton loaders matching component shapes:

- Card skeleton: Animated gradient pulse
- Table row skeleton: Multiple lines
- Stats skeleton: Number placeholder

Colors: Use gray-200 to gray-300 gradient
Animation: Subtle pulse effect, 1.5s duration"
```

### Error Boundaries
```
Prompt: "Add error handling:

- Inline error messages (red text, existing style)
- Toast notifications for actions
- Fallback UI for failed components
- Retry buttons where appropriate

Keep friendly tone, suggest actions"
```

---

## 10. Performance Optimizations

### Code Splitting
```
Prompt: "Implement code splitting:

- Lazy load admin routes
- Lazy load create draw wizard
- Lazy load heavy components (NFT grid)
- Preload critical paths

Use Next.js dynamic imports with loading states"
```

### Image Optimization
```
Prompt: "Optimize images:

- Use Next.js Image component
- Lazy load below fold
- Blur placeholders for NFTs
- WebP format with fallbacks
- Responsive sizes

Keep existing aspect ratios and styles"
```

---

## Component File Structure Example

```
src/
├── components/
│   ├── draws/
│   │   ├── DrawCard.tsx (enhanced)
│   │   ├── DrawFilters.tsx (new)
│   │   ├── DrawTypeSelector.tsx (new)
│   │   ├── TokenSelector.tsx (new)
│   │   ├── NFTSelector.tsx (new)
│   │   └── MultiWinnerConfig.tsx (new)
│   ├── profile/
│   │   ├── PrizeClaim.tsx (new)
│   │   └── CreatedDraws.tsx (new)
│   └── admin/
│       ├── Dashboard.tsx (new)
│       ├── UserManagement.tsx (new)
│       └── EmergencyControls.tsx (new)
├── hooks/
│   ├── useGridottoContract.tsx (updated)
│   ├── useDraws.ts (new)
│   └── useRealtime.ts (new)
└── app/
    ├── create-draw/
    │   └── page.tsx (new)
    ├── draws/
    │   └── page.tsx (new)
    ├── admin/
    │   └── page.tsx (new)
    └── api/
        ├── draws/
        └── users/
```

---

## Testing Checklist for Each Component

1. **Visual Testing**
   - Matches existing design system
   - Responsive on all breakpoints
   - Hover/focus states work
   - Animations are smooth

2. **Functional Testing**
   - All interactions work
   - Form validation works
   - Error states display correctly
   - Loading states show

3. **Integration Testing**
   - Contract calls succeed
   - Data updates properly
   - Real-time updates work
   - Navigation flows work

4. **Performance Testing**
   - Component renders quickly
   - No memory leaks
   - Animations don't lag
   - Images load efficiently

---

**Remember**: Always reference existing components for styling patterns. The goal is seamless integration with the current UI!