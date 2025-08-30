**CSV to MD table** is a Nova editor extension that converts between CSV/TSV and Markdown table formats.

## Features

- Convert CSV or TSV to a Markdown table
- Convert a Markdown table back to CSV
- Automatic format detection based on the selected text or the cursor context
- Works on selections, or automatically detects table-like lines around the cursor (commas, tabs, or pipes)


## Usage

To run the extension:

- Select the **Editor → Convert CSV/TSV to Markdown** menu item; or  
- Open the command palette and type `Convert`; or  
- Press `command`+`control`+`T`

The command will run on either:

1. the selected text  
2. the text surrounding the cursor  


## Example: CSV to Markdown

Before:
```
ITEM,PRICE
Alpha,1.10
Beta,2.00
Delta,3.50
Gamma,1.50
```

After:
```
| ITEM | PRICE |
| ----- | ----- |
| Alpha | 1.10 |
| Beta | 2.00 |
| Delta | 3.50 |
| Gamma | 1.50 |
```

## Example: Markdown to CSV

Before:
```
| ITEM | PRICE |
| ----- | ----- |
| Alpha | 1.10 |
| Beta | 2.00 |
| Delta | 3.50 |
| Gamma | 1.50 |
```

After:
```
ITEM,PRICE
Alpha,1.10
Beta,2.00
Delta,3.50
Gamma,1.50
```
