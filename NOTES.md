# UI/X Feedback / Fixes

For mobile, our benchmark width is now 360 px


## Make Global Styles

- [x] Consistent page titles / descriptions
- [x] Consistent Button Styling
- [x] Consistent card grid styling
- [x] Consistent card styling / component use
- [x] Consistent Filter / Search site-wide


## Login page

- [x] Cuts off at the top
- [x] Doesn't scroll nicely
- [x] Added logo instead of text for app name


## Navigation

- [x] Search cuts off (overflow hidden...?)
- [x] Search bar requires a clear button
- [x] Navbar doesn't clear on page refresh
- [x] Highlighted option is too pink
- [x] Menu does not hide if page is changed?
- [x] menu doesn't close if clicked/pressed outside of the menu
- [x] search bar position is now left aligned instead, works nicer over there.
- [x] Fix logo height (new logo...? 😬)
- [x] Moved admin links to the user dropdown (helps keep header tidy)


## Catalogue

- [x] Current limited card (hide if no limited)
- [x] Put limited card in the main section
- [x] Move Remaining to left side of card
- [x] Make "Expired" tag more prominent (No longer available..?)
- [x] Mark "limited time cards" with a stamp or icon


## Nice to haves

- [x] Remove "The" from alphabetical sorting
- [x] Burger Menu icon fix
- [x] Copy layout of Profile Overview stat boxes to other pages that use similar formats


## Dashboard

- [x] Burger is wrong the size
- [x] Title/Header is too tight to nav bar


## Inspect View

- [x] featured button is now behind card
- [x] card is not centered
- [x] add placeholder lore box


## Card Grading

- [x] Grading a card buttons different size (Grade Card / Cancel)
- [x] Grading in progress - in a box
- [x] Cards need to be in a box
- [x] new rarity box on grading page
- [x] Rarity filter shows active and includes slabbed, but if only that rarity is slabbed then we shouldn't highlight


## Collection

- [x] Fix inconsistent spacing with slabbed
- [x] Card Inspect is too thick (mobile)
- [x] Filters (could be hidden behind a button/panel?) [similar to nebula camo tracker]
    - [x] show featured only
    - [x] slabbed only
    - [x] limited only
- [ ] Card Scale - still has bugged page height when scaled


## Market

- [x] Page is contained in a box
- [x] Filters
- [x] Cards are too narrow
- [x] View and Make Offer (very primitive)


## Trading

- [x] .tp-card-item .card-border { // REMOVE THIS STYLING
    - [x] /* padding: 8px !important; */
    - [x] /* border-width: 6px !important; */
- [x] } "tp-suggestions" needs to be hidden when not filled
- [x] Hide Trade Form should clear users from the trade list
- [x] View Trades table needs styling
- [x] Card Scale on popup is small
- [x] "Mini Card" previews?
- [x] Create Trade page


## Achievements

- [x] ⚠️ Toggle to hide completed achievements (save to storage) [ needs styling ]
    - Removed for now.


## User Requests /  QoL

- [x] "Toggle Slab" on card inspect view (Check with JB this is ok to have)
- [x] Trade limit now increased to *5* cards, up from 3.
- [x] Implemented a "MiniCard" style / preview shown where the full card does not quite fit on the screen.
- [x] Implemented a "back to top" button
- [x] Search dropdowns should make use of up/down and enter keys
- [x] Early Access / In development notice


### Maybe maybe fix it?

- [x] POTENSH: Mobile finger hover on a card should move the card around
- [x] Nearly there: Card Scale / site wide card scale
    - [x] Look at side effects (inspect view more specifically)
- [x] [Admin Only] Card Audit Page
- [ ] [Admin Only] View Card Owner Page
- [ ] [Admin Only] Audit / Action Log Page
- [ ] Packs should have different backs(?)



# Issues since live

## Navigation

- [ ] Only one of the navigation dropdowns should be open at once (main nav / profile nav)
- [x] Card min scale should be 35% on mobile


