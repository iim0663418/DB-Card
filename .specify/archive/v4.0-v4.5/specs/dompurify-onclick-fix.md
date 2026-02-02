# DOMPurify onclick Fix

## Issue
DOMPurify removes onclick attributes (XSS protection)
Card edit buttons don't work

## Solution
Use event delegation instead of inline onclick

## Changes Needed
1. Remove onclick from HTML
2. Add data-action and data-type attributes
3. Add event listener to container
