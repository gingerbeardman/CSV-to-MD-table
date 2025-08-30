exports.activate = function() {
    nova.commands.register("com.gingerbeardman.csv2md", convertTableFormat);
}

function convertTableFormat(editor) {
    editor.edit(function(e) {
        // Check if there's any actual text selection
        let hasSelection = editor.selectedRanges.some(range => range.length > 0);
        
        if (hasSelection) {
            // Process each selection independently
            for (let range of editor.selectedRanges.reverse()) {
                let text = editor.getTextInRange(range);
                // Preserve trailing whitespace/newlines after the selection
                let trailingWhitespaceMatch = text.match(/\s*$/);
                let trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : '';
                let coreText = text.replace(/\s*$/, '');
                let processedText = processTable(coreText);
                if (processedText !== null) {
                    e.replace(range, processedText + trailingWhitespace);
                }
            }
        } else {
            // Work on current paragraph/block
            let cursorPosition = editor.selectedRange.start;
            let blockRange = findTableBlock(editor, cursorPosition);
            
            if (blockRange) {
                let text = editor.getTextInRange(blockRange);
                // Preserve trailing whitespace/newlines after the block
                let trailingWhitespaceMatch = text.match(/\s*$/);
                let trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : '';
                let coreText = text.replace(/\s*$/, '');
                let processedText = processTable(coreText);
                if (processedText !== null) {
                    e.replace(blockRange, processedText + trailingWhitespace);
                }
            }
        }
    });
}

function findTableBlock(editor, position) {
    let document = editor.document;
    let totalLength = document.length;
    
    // Find the line containing the cursor
    let currentLineRange = editor.getLineRangeForRange(new Range(position, position));
    let currentLineText = editor.getTextInRange(currentLineRange).trim();
    
    // If cursor is on an empty line, do nothing
    if (currentLineText === '') {
        return null;
    }
    
    // Detect what type of table we're in based on current line
    let isCSVContext = currentLineText.includes(',');
    let isMarkdownContext = currentLineText.includes('|');
    let isTSVContext = currentLineText.includes('\t');
    
    // If current line doesn't look like table content, try to detect from surrounding lines
    if (!isCSVContext && !isMarkdownContext && !isTSVContext) {
        // Check a few lines above and below for context
        for (let offset = -2; offset <= 2; offset++) {
            if (offset === 0) continue;
            
            try {
                let testPos = position + (offset * 50); // Rough estimate to get to different lines
                if (testPos < 0 || testPos >= totalLength) continue;
                
                let testLineRange = editor.getLineRangeForRange(new Range(testPos, testPos));
                let testLineText = editor.getTextInRange(testLineRange).trim();
                
                if (testLineText.includes(',')) {
                    isCSVContext = true;
                    break;
                } else if (testLineText.includes('|')) {
                    isMarkdownContext = true;
                    break;
                } else if (testLineText.includes('\t')) {
                    isTSVContext = true;
                    break;
                }
            } catch (e) {
                // Ignore errors when trying to detect context
            }
        }
    }
    
    // If we still can't detect table context, fall back to block detection
    if (!isCSVContext && !isMarkdownContext && !isTSVContext) {
        return findGenericBlock(editor, position);
    }
    
    // Find table start (look backwards for lines with matching delimiters)
    let blockStart = currentLineRange.start;
    let searchPos = currentLineRange.start;
    
    while (searchPos > 0) {
        // Move to previous line
        let prevLineEnd = searchPos - 1;
        if (prevLineEnd < 0) break;
        
        let prevLineRange = editor.getLineRangeForRange(new Range(prevLineEnd, prevLineEnd));
        let prevLineText = editor.getTextInRange(prevLineRange).trim();
        
        // Check if previous line matches our table type
        let lineMatches = false;
        if (isCSVContext && prevLineText.includes(',')) {
            lineMatches = true;
        } else if (isTSVContext && prevLineText.includes('\t')) {
            lineMatches = true;
        } else if (isMarkdownContext && prevLineText.includes('|')) {
            lineMatches = true;
        }
        
        if (prevLineText === '' || !lineMatches) {
            // Found empty line or non-matching line, table starts after it
            break;
        } else {
            // This line matches our table type, include it
            blockStart = prevLineRange.start;
            searchPos = prevLineRange.start;
        }
    }
    
    // Find table end (look forwards for lines with matching delimiters)
    let blockEnd = currentLineRange.end;
    searchPos = currentLineRange.end;
    
    while (searchPos < totalLength) {
        // Try to get next line
        let nextLineRange;
        try {
            nextLineRange = editor.getLineRangeForRange(new Range(searchPos, searchPos));
            // If we're at the same line, move to next line start
            if (nextLineRange.start === currentLineRange.start) {
                if (searchPos >= totalLength - 1) break;
                nextLineRange = editor.getLineRangeForRange(new Range(searchPos + 1, searchPos + 1));
            }
        } catch (e) {
            // Reached end of document
            break;
        }
        
        let nextLineText = editor.getTextInRange(nextLineRange).trim();
        
        // Check if next line matches our table type
        let lineMatches = false;
        if (isCSVContext && nextLineText.includes(',')) {
            lineMatches = true;
        } else if (isTSVContext && nextLineText.includes('\t')) {
            lineMatches = true;
        } else if (isMarkdownContext && nextLineText.includes('|')) {
            lineMatches = true;
        }
        
        if (nextLineText === '' || !lineMatches) {
            // Found empty line or non-matching line, table ends before it
            break;
        } else {
            // This line matches our table type, include it
            blockEnd = nextLineRange.end;
            searchPos = nextLineRange.end;
        }
    }
    
    return new Range(blockStart, blockEnd);
}

function findGenericBlock(editor, position) {
    let document = editor.document;
    let totalLength = document.length;
    
    // Find the line containing the cursor
    let currentLineRange = editor.getLineRangeForRange(new Range(position, position));
    
    // Find block start (look backwards for empty line or document start)
    let blockStart = currentLineRange.start;
    let searchPos = currentLineRange.start;
    
    while (searchPos > 0) {
        // Move to previous line
        let prevLineEnd = searchPos - 1;
        if (prevLineEnd < 0) break;
        
        let prevLineRange = editor.getLineRangeForRange(new Range(prevLineEnd, prevLineEnd));
        let prevLineText = editor.getTextInRange(prevLineRange).trim();
        
        if (prevLineText === '') {
            // Found empty line, block starts after it
            break;
        } else {
            // This line has content, include it in block
            blockStart = prevLineRange.start;
            searchPos = prevLineRange.start;
        }
    }
    
    // Find block end (look forwards for empty line or document end)
    let blockEnd = currentLineRange.end;
    searchPos = currentLineRange.end;
    
    while (searchPos < totalLength) {
        // Try to get next line
        let nextLineRange;
        try {
            nextLineRange = editor.getLineRangeForRange(new Range(searchPos, searchPos));
            // If we're at the same line, move to next line start
            if (nextLineRange.start === currentLineRange.start) {
                if (searchPos >= totalLength - 1) break;
                nextLineRange = editor.getLineRangeForRange(new Range(searchPos + 1, searchPos + 1));
            }
        } catch (e) {
            // Reached end of document
            break;
        }
        
        let nextLineText = editor.getTextInRange(nextLineRange).trim();
        
        if (nextLineText === '') {
            // Found empty line, block ends before it
            break;
        } else {
            // This line has content, include it in block
            blockEnd = nextLineRange.end;
            searchPos = nextLineRange.end;
        }
    }
    
    return new Range(blockStart, blockEnd);
}

function processTable(text) {
    text = text.trim();
    
    // Detect if it's a Markdown table
    if (isMarkdownTable(text)) {
        return markdownToCSV(text);
    }
    // Detect if it's CSV/TSV
    else if (isCSVOrTSV(text)) {
        return csvToMarkdown(text);
    }
    
    return null; // Not a recognized format
}

function isMarkdownTable(text) {
    let lines = text.split('\n');
    if (lines.length < 2) return false;
    
    // Check if second line looks like a separator (contains dashes and pipes)
    let separatorLine = lines[1].trim();
    return separatorLine.includes('|') && separatorLine.includes('-');
}

function isCSVOrTSV(text) {
    let lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 1) return false;
    
    // Check if it contains commas or tabs consistently
    let hasCommas = lines.every(line => line.includes(','));
    let hasTabs = lines.every(line => line.includes('\t'));
    
    return hasCommas || hasTabs;
}

function csvToMarkdown(text) {
    let lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return text;
    
    // Detect delimiter (comma or tab)
    let delimiter = lines[0].includes('\t') ? '\t' : ',';
    
    // Parse CSV/TSV
    let rows = lines.map(line => {
        return line.split(delimiter).map(cell => cell.trim());
    });
    
    if (rows.length === 0) return text;
    
    // Build Markdown table
    let result = [];
    
    // Header row
    result.push('| ' + rows[0].join(' | ') + ' |');
    
    // Separator row
    let separators = rows[0].map(() => '-----');
    result.push('| ' + separators.join(' | ') + ' |');
    
    // Data rows
    for (let i = 1; i < rows.length; i++) {
        // Pad row to match header length
        while (rows[i].length < rows[0].length) {
            rows[i].push('');
        }
        result.push('| ' + rows[i].join(' | ') + ' |');
    }
    
    return result.join('\n');
}

function markdownToCSV(text) {
    let lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return text;
    
    // Remove separator line (second line)
    let dataLines = lines.filter((line, index) => {
        if (index === 1) {
            // Check if this is a separator line
            let trimmed = line.trim();
            return !(trimmed.includes('|') && trimmed.includes('-'));
        }
        return true;
    });
    
    // Parse Markdown table rows
    let rows = dataLines.map(line => {
        // Remove leading/trailing pipes and split
        let cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
        return cells.map(cell => cell.trim());
    });
    
    if (rows.length === 0) return text;
    
    // Convert to CSV format
    let result = rows.map(row => {
        // Escape cells that contain commas by wrapping in quotes
        return row.map(cell => {
            if (cell.includes(',') || cell.includes('"')) {
                // Escape quotes by doubling them
                let escaped = cell.replace(/"/g, '""');
                return '"' + escaped + '"';
            }
            return cell;
        }).join(',');
    });
    
    return result.join('\n');
}