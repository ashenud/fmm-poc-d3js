// D3.js Radial Hierarchical Visualization - Optimized Version
(function () {
    'use strict';

    // Configuration
    const config = {
        width: window.innerWidth,
        height: window.innerHeight,
        nodeSize: d => [80, 50, 30, 24][Math.min(d.depth, 3)], // Size by depth (reduced)
        distance: d => [0, 220, 140, 100][Math.min(d.depth + 1, 3)], // Distance by depth (reduced)
        bubbleRadius: 13,
        colors: {
            gradients: ['#ff6b9d', '#a29bfe', '#ff9ff3', '#ffc8dd'], // Root, Category, Subcategory, Leaf
            bubble: '#74b9ff',
            links: ['#dda0ff', '#c7a0ff']
        }
    };

    // Setup SVG
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', config.width)
        .attr('height', config.height);

    const g = svg.append('g')
        .attr('transform', `translate(${config.width / 2}, ${config.height / 2})`);

    const tooltip = d3.select('#tooltip');

    // Create gradients dynamically
    const defs = svg.append('defs');
    ['root', 'category', 'subcategory', 'leaf'].forEach((type, i) => {
        const gradient = defs.append('radialGradient').attr('id', `${type}Gradient`);
        gradient.append('stop').attr('offset', '0%').attr('stop-color', config.colors.gradients[i]);
        gradient.append('stop').attr('offset', '100%')
            .attr('stop-color', d3.color(config.colors.gradients[i]).darker(0.5));
    });

    // Load and render
    d3.json('data.json').then(data => render(data));

    function render(data) {
        const root = d3.hierarchy(data)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);

        // Calculate positions
        const nodes = getPositions(root);
        const links = root.links().map(l => ({
            source: l.source.data.id,
            target: l.target.data.id,
            type: l.target.depth === 1 ? 'primary' : 'secondary'
        }));

        // Force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
                // Adjust distance based on link type
                return d.type === 'primary' ? 220 : 80;
            }).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-50))
            .force('collision', d3.forceCollide().radius(d => d.radius + 10))
            .alphaDecay(0.05)
            .on('tick', () => {
                // Update parent positions during simulation
                updateParentPositions(nodes, links);
                update(nodes, links);
            })
            .on('end', () => {
                simulation.stop();
                // Redraw count bubbles with final positions
                redrawCountBubbles(nodes);
                animateEntrance();
            });

        setTimeout(() => {
            simulation.stop();
            // Redraw count bubbles with final positions
            redrawCountBubbles(nodes);
        }, 2000);

        drawLinks(links);
        drawNodes(nodes);
    }

    function getPositions(root) {
        const nodes = [];
        let counter = 0;

        root.each(node => {
            const depth = node.depth;
            const hasChildren = node.children && node.children.length > 0;

            // Calculate position
            let x = 0, y = 0, fx, fy;

            if (depth === 0) {
                // Root at center
                fx = fy = x = y = 0;
            } else if (depth === 1) {
                // First level: evenly distributed around center
                const siblings = node.parent.children;
                const index = siblings.indexOf(node);
                const angle = (index * 2 * Math.PI / siblings.length) - Math.PI / 2;
                x = fx = Math.cos(angle) * 220;
                y = fy = Math.sin(angle) * 220;
            } else {
                // Deeper levels: positioned relative to parent
                const siblings = node.parent.children;
                const index = siblings.indexOf(node);
                const parentAngle = Math.atan2(node.parent.y || 0, node.parent.x || 0);
                const spread = Math.min(siblings.length / 8, 0.5);
                const angleStep = (Math.PI * spread) / Math.max(siblings.length - 1, 1);
                const angle = parentAngle - (Math.PI * spread / 2) + (index * angleStep);
                const distance = depth === 2 ? 140 : 100; // Distance for level 2 and 3
                x = (node.parent.x || 0) + Math.cos(angle) * distance;
                y = (node.parent.y || 0) + Math.sin(angle) * distance;
            }

            // Store calculated data
            node.data.id = depth === 0 ? 'root' : `node-${counter++}`;
            node.x = x;
            node.y = y;
            if (fx !== undefined) { node.fx = fx; node.fy = fy; }

            nodes.push({
                id: node.data.id,
                name: node.data.name,
                value: node.value,
                depth: depth,
                x: x,
                y: y,
                fx: fx,
                fy: fy,
                radius: config.nodeSize(node),
                hasChildren: hasChildren,
                gradient: `url(#${['root', 'category', 'subcategory', 'leaf'][Math.min(depth, 3)]}Gradient)`,
                parentX: node.parent ? (node.parent.x || 0) : null,
                parentY: node.parent ? (node.parent.y || 0) : null
            });
        });

        return nodes;
    }

    function drawLinks(links) {
        g.append('g').attr('class', 'links')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', d => config.colors.links[d.type === 'primary' ? 0 : 1])
            .attr('stroke-width', d => d.type === 'primary' ? 2.5 : 1.5)
            .attr('opacity', 0.3);
    }

    function drawNodes(nodes) {
        const nodeGroups = g.append('g').attr('class', 'nodes')
            .selectAll('g')
            .data(nodes, d => d.id)
            .join('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Main circles
        nodeGroups.append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => d.radius)
            .attr('fill', d => d.gradient)
            .style('filter', d => d.depth === 0 ?
                'drop-shadow(0 0 15px rgba(255,107,157,0.6))' :
                'drop-shadow(0 0 8px rgba(108,92,231,0.4))')
            .style('cursor', 'pointer')
            .on('mouseenter', (e, d) => handleHover(e, d, true))
            .on('mouseleave', (e, d) => handleHover(e, d, false));

        // Labels
        nodeGroups.append('text')
            .attr('class', 'node-text')
            .attr('text-anchor', 'middle')
            .attr('dy', d => d.depth === 0 ? '-10' : '0.35em')
            .attr('fill', '#fff')
            .style('font-size', d => [18, 13, 10, 9][Math.min(d.depth, 3)] + 'px')
            .style('font-weight', d => d.hasChildren ? 600 : 500)
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8)')
            .text(d => d.depth === 0 ? d.name.split(' ')[0] : d.name);

        // Root subtitle
        nodeGroups.filter(d => d.depth === 0)
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '12')
            .attr('fill', '#fff')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8)')
            .text(d => d.name.split(' ').slice(1).join(' '));

        // Count bubbles will be drawn after simulation settles
        // drawCountBubbles(nodeGroups.filter(d => !d.hasChildren && d.value));
    }

    function drawCountBubbles(leafNodes) {
        leafNodes.each(function (d) {
            // Calculate angle from parent to this node
            // Then extend bubble in the opposite direction (away from parent)
            const dx = d.x - (d.parentX || 0);
            const dy = d.y - (d.parentY || 0);
            const angle = Math.atan2(dy, dx); // Angle from parent to node

            // Position bubble along the line extending away from parent
            const offset = d.radius + 18;
            const bubbleX = Math.cos(angle) * offset;
            const bubbleY = Math.sin(angle) * offset;

            // Edge of node along the same line
            const nodeEdgeX = Math.cos(angle) * d.radius;
            const nodeEdgeY = Math.sin(angle) * d.radius;

            const group = d3.select(this);

            // Connecting line from node edge to bubble
            group.append('line')
                .attr('class', 'count-link')
                .attr('x1', nodeEdgeX)
                .attr('y1', nodeEdgeY)
                .attr('x2', bubbleX)
                .attr('y2', bubbleY)
                .attr('stroke', config.colors.bubble)
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.4);

            // Bubble position (relative to node)
            const bubble = group.append('g')
                .attr('class', 'count-bubble')
                .attr('transform', `translate(${bubbleX},${bubbleY})`);

            bubble.append('circle')
                .attr('r', config.bubbleRadius)
                .attr('fill', config.colors.bubble)
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');

            bubble.append('text')
                .attr('class', 'count-text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('fill', '#fff')
                .style('font-size', '10px')
                .style('font-weight', 600)
                .style('pointer-events', 'none')
                .text(formatNumber(d.value));
        });
    }

    function updateParentPositions(nodes, links) {
        // Update parent positions for all nodes based on links
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        links.forEach(link => {
            const targetNode = nodeMap.get(link.target.id || link.target);
            const sourceNode = nodeMap.get(link.source.id || link.source);
            if (targetNode && sourceNode) {
                targetNode.parentX = sourceNode.x;
                targetNode.parentY = sourceNode.y;
            }
        });
    }

    function update(nodes, links) {
        g.selectAll('.link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        g.selectAll('.node')
            .attr('transform', d => `translate(${d.x},${d.y})`);
    }

    function redrawCountBubbles(nodes) {
        // Remove existing bubbles and links
        g.selectAll('.count-bubble').remove();
        g.selectAll('.count-link').remove();

        // Get leaf nodes
        const leafNodes = nodes.filter(d => !d.hasChildren && d.value);

        // Redraw with updated positions
        leafNodes.forEach(d => {
            const node = g.selectAll('.node').filter(nd => nd.id === d.id);

            // Calculate angle from parent to this node using updated positions
            const dx = d.x - (d.parentX || 0);
            const dy = d.y - (d.parentY || 0);
            const angle = Math.atan2(dy, dx);

            // Position bubble along the line extending away from parent
            const offset = d.radius + 18;
            const bubbleX = Math.cos(angle) * offset;
            const bubbleY = Math.sin(angle) * offset;

            // Edge of node along the same line
            const nodeEdgeX = Math.cos(angle) * d.radius;
            const nodeEdgeY = Math.sin(angle) * d.radius;

            // Connecting line with animation
            node.append('line')
                .attr('class', 'count-link')
                .attr('x1', nodeEdgeX)
                .attr('y1', nodeEdgeY)
                .attr('x2', nodeEdgeX) // Start at node edge
                .attr('y2', nodeEdgeY)
                .attr('stroke', config.colors.bubble)
                .attr('stroke-width', 0)
                .attr('opacity', 0)
                .transition()
                .duration(500)
                .delay((leafNodes.indexOf(d) * 30) + 100) // Slight delay after bubble starts
                .attr('x2', bubbleX) // Grow to bubble position
                .attr('y2', bubbleY)
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.4);

            // Bubble with scale animation
            const bubble = node.append('g')
                .attr('class', 'count-bubble')
                .attr('transform', `translate(${bubbleX},${bubbleY}) scale(0)`) // Start at scale 0
                .style('opacity', 0);

            bubble.append('circle')
                .attr('r', config.bubbleRadius)
                .attr('fill', config.colors.bubble)
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');

            bubble.append('text')
                .attr('class', 'count-text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('fill', '#fff')
                .style('font-size', '10px')
                .style('font-weight', 600)
                .style('pointer-events', 'none')
                .text(formatNumber(d.value));

            // Animate bubble growth with elastic easing
            bubble.transition()
                .duration(600)
                .delay((leafNodes.indexOf(d) * 30)) // Stagger animation
                .ease(d3.easeElasticOut.amplitude(1).period(0.4))
                .attr('transform', `translate(${bubbleX},${bubbleY}) scale(1)`)
                .style('opacity', 1);
        });
    }

    function handleHover(event, data, enter) {
        const node = d3.select(event.target.parentNode);
        node.raise();

        d3.select(event.target)
            .transition().duration(200)
            .attr('r', enter ? data.radius * 1.15 : data.radius)
            .style('filter', enter ?
                'drop-shadow(0 0 20px rgba(108,92,231,0.8))' :
                data.depth === 0 ? 'drop-shadow(0 0 15px rgba(255,107,157,0.6))' :
                    'drop-shadow(0 0 8px rgba(108,92,231,0.4))');

        // Scale text on hover
        node.selectAll('.node-text')
            .transition().duration(200)
            .style('font-size', function () {
                const currentSize = parseFloat(d3.select(this).style('font-size'));
                return enter ? (currentSize * 1.1) + 'px' : null;
            });

        // Scale count bubbles
        node.selectAll('.count-bubble')
            .transition().duration(200)
            .attr('transform', function () {
                const currentTransform = d3.select(this).attr('transform');
                const match = currentTransform.match(/translate\(([-\d.]+),([-\d.]+)\)/);
                if (match) {
                    const x = parseFloat(match[1]);
                    const y = parseFloat(match[2]);
                    return `translate(${x},${y}) scale(${enter ? 1.15 : 1})`;
                }
                return currentTransform;
            });

        node.selectAll('.count-link')
            .transition().duration(200)
            .attr('opacity', enter ? 0.8 : 0.4)
            .attr('stroke-width', enter ? 2 : 1.5);

        if (enter) {
            tooltip
                .html(`<div style="font-weight:600;font-size:16px;color:#6c5ce7;margin-bottom:4px">${data.name}</div>
                       ${data.value ? `<div style="font-size:14px;color:#666">Count: ${formatNumber(data.value)}</div>` : ''}`)
                .classed('show', true)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 15) + 'px');

            // Highlight connected links
            g.selectAll('.link').style('opacity', l =>
                (l.source.id === data.id || l.target.id === data.id) ? 0.8 : 0.1
            );
        } else {
            tooltip.classed('show', false);
            g.selectAll('.link').style('opacity', 0.3);
        }
    }

    function animateEntrance() {
        g.selectAll('.node-circle')
            .style('opacity', 0)
            .transition().duration(600).style('opacity', 1);

        g.selectAll('.node-text')
            .style('opacity', 0)
            .transition().duration(500).delay(100).style('opacity', 1);

        // Count bubbles and links are animated in redrawCountBubbles()
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
        return num.toString();
    }

    // Responsive
    window.addEventListener('resize', () => {
        config.width = window.innerWidth;
        config.height = window.innerHeight;
        svg.attr('width', config.width).attr('height', config.height);
        g.attr('transform', `translate(${config.width / 2}, ${config.height / 2})`);
    });

})();
