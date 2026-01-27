import React from 'react';
import {rarities} from "../../constants/rarities";
import BaseCard from "../../components/BaseCard";

const KitchenSink = () => {
    const [toggleSlabbedPreview, setToggleSlabbedPreview] = React.useState(false);

    const handleRangeChange = (e) => {
        const value = e.target.value;
        const max = e.target.max || 100;
        const percentage = (value / max) * 100;
        e.target.style.setProperty('--range-progress', `${percentage}%`);
    };

    return (
        <>
            <div className="page">
                <h1><i className="fas fa-hammer"></i> Kitchen Sink Test Page</h1>
                <p className="section-card">
                    This page contains a variety of HTML elements to help you test your global stylesheet.
                    Observe how your CSS rules apply to each element below.
                </p>

                <hr/>

                <h1>Heading 1 (h1)</h1>
                <h2>Heading 2 (h2)</h2>
                <h3>Heading 3 (h3)</h3>
                <h4>Heading 4 (h4)</h4>
                <h5>Heading 5 (h5)</h5>
                <h6>Heading 6 (h6)</h6>

                <hr/>

                <h2>Paragraphs and Text</h2>
                <p>
                    This is a standard paragraph of text. It contains some <strong>bold text</strong>, some <em>italic
                    text</em>,
                    and some <a href="#top">linked text</a>. We can also add a <small>small tag</small> and
                    a <span>span tag</span>.
                </p>
                <p>
                    Another paragraph to test spacing and line-height. Lorem ipsum dolor sit amet, consectetur
                    adipiscing elit.
                    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
                    nostrud
                    exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <blockquote>
                    <p>This is a blockquote. It's often used for quotations or extended passages of text that are set
                        apart.</p>
                    <cite>— Someone Famous</cite>
                </blockquote>
                <pre>
                This is preformatted text.
                It preserves   whitespace
                and line breaks.
            </pre>
                <code>console.log('This is inline code;');</code>
                <p>
                    Here's some more text with a <mark>highlighted section</mark> and some
                    <del>deleted text</del> and <ins>inserted text</ins>.
                </p>

                <hr/>

                <button className="sm" style={{float: 'right'}} onClick={() => setToggleSlabbedPreview(!toggleSlabbedPreview)}>Toggle Slabbed</button>
                <br/>
                <h2>Single Card</h2>

                <BaseCard
                    name="The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier={null}
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />

                <hr/>


                <button className="sm" style={{float: 'right'}} onClick={() => setToggleSlabbedPreview(!toggleSlabbedPreview)}>Toggle Slabbed</button>
                <br/>
                <h2>Card Tile</h2>
                <div className="card-tile-grid">
                    <div className="card-tile">
                        <BaseCard
                            name="The Cursed Bristles"
                            image="/images/cards/thecursedbristles.jpg"
                            description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                            rarity="basic"
                            mintNumber="666"
                            modifier={null}
                            grade={6}
                            slabbed={toggleSlabbedPreview}
                        />
                        <div className="actions">
                            <button className="success-button">Confirm</button>
                            <button className="danger-button">Cancel</button>
                        </div>
                    </div>
                    <div className="card-tile">
                        <BaseCard
                            name="The Cursed Bristles"
                            image="/images/cards/thecursedbristles.jpg"
                            description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                            rarity="rare"
                            mintNumber="666"
                            modifier={null}
                            grade={6}
                            slabbed={toggleSlabbedPreview}
                        />
                        <div className="actions">
                            <button className="success-button">Confirm</button>
                            <button className="danger-button">Cancel</button>
                        </div>
                    </div>
                    <div className="card-tile">
                        <BaseCard
                            name="The Cursed Bristles"
                            image="/images/cards/thecursedbristles.jpg"
                            description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                            rarity="legendary"
                            mintNumber="666"
                            modifier={null}
                            grade={6}
                            slabbed={toggleSlabbedPreview}
                        />
                        <div className="actions">
                            <button className="success-button">Confirm</button>
                            <button className="danger-button">Cancel</button>
                        </div>
                    </div>
                </div>
                <hr/>
            </div>


            <button className="sm" style={{float: 'right'}} onClick={() => setToggleSlabbedPreview(!toggleSlabbedPreview)}>Toggle Slabbed</button>
            <br/>
            <h2>Card Rarities (Grid)</h2>
            <div className="cards-grid">
                {rarities.map((r) => {
                    return (
                        <BaseCard
                            name="The Cursed Bristles"
                            image="/images/cards/thecursedbristles.jpg"
                            description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                            rarity={r.name}
                            mintNumber="666"
                            modifier={null}
                            grade={6}
                            slabbed={toggleSlabbedPreview}
                        />
                    );
                })}
            </div>


            <button className="sm" style={{float: 'right'}} onClick={() => setToggleSlabbedPreview(!toggleSlabbedPreview)}>Toggle Slabbed</button>
            <br/>
            <h2>Card Modifiers</h2>
            <div className="cards-grid">
                <BaseCard
                    name="Negative The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Negative"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />
                <BaseCard
                    name="Glitched The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Glitch"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />
                <BaseCard
                    name="The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Prismatic"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />
                <BaseCard
                    name="Rainbow The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Rainbow"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />
                <BaseCard
                    name="Cosmic The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Cosmic"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />
                <BaseCard
                    name="Aqua The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Aqua"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                />
            </div>

            <button className="sm" style={{float: 'right'}} onClick={() => setToggleSlabbedPreview(!toggleSlabbedPreview)}>Toggle Slabbed</button>
            <br/>
            <h2>Card Grades 1-10</h2>
            <div className="cards-grid">
                {Array.from({ length: 10 }, (_, index) => {
                    const grade = index + 1;
                    return (
                        <BaseCard
                            key={`grade-${grade}`}
                            name={`The Cursed Bristles - Grade ${grade}`}
                            image="/images/cards/thecursedbristles.jpg"
                            description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                            rarity="basic"
                            mintNumber="666"
                            modifier={null}
                            grade={grade}
                            slabbed={toggleSlabbedPreview}
                        />
                    );
                })}
            </div>


            <button className="sm" style={{float: 'right'}} onClick={() => setToggleSlabbedPreview(!toggleSlabbedPreview)}>Toggle Slabbed</button>
            <br/>
            <h2>MiniCards (Grid)</h2>
            <div className="cards-grid mini">
                {rarities.map((r) => {
                    return (
                        <BaseCard
                            name="The Cursed Bristles"
                            image="/images/cards/thecursedbristles.jpg"
                            description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                            rarity={r.name}
                            mintNumber="666"
                            modifier={null}
                            grade={6}
                            slabbed={toggleSlabbedPreview}
                            miniCard={true}
                        />
                    );
                })}
                <BaseCard
                    name="Negative The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Negative"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                    miniCard={true}
                />
                <BaseCard
                    name="Glitched The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Glitch"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                    miniCard={true}
                />
                <BaseCard
                    name="The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Prismatic"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                    miniCard={true}
                />
                <BaseCard
                    name="Rainbow The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Rainbow"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                    miniCard={true}
                />
                <BaseCard
                    name="Cosmic The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Cosmic"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                    miniCard={true}
                />
                <BaseCard
                    name="Aqua The Cursed Bristles"
                    image="/images/cards/thecursedbristles.jpg"
                    description="Worn by a long-forgotten pirate lord, this beard carries the whispers of the deep. Each strand is tangled with lost treasure, but those who dare to claim it are doomed to an itch that never fades. -ItchyBeard"
                    rarity="basic"
                    mintNumber="666"
                    modifier="Aqua"
                    grade={6}
                    slabbed={toggleSlabbedPreview}
                    miniCard={true}
                />
            </div>

            <div className="page">
                <h2><i className="fas fa-hand-pointer"></i> Buttons</h2>
                <div className="button-group">
                    <button>Default Button</button>
                    <button className="primary-button">Primary Button</button>
                    <button className="secondary-button">Secondary Button</button>
                    <button disabled><i className="fas fa-ban"></i> Disabled Button</button>
                </div>

                <div className="button-group">
                    <input type="reset" className="success-button" value="Success Button"/>
                    <input type="submit" className="danger-button" value="Danger Button"/>
                    <input type="submit" className="reject-button" value="Reject Button"/>
                </div>

                <div className="button-group">
                    <button className="icon" title="Edit"><i className="fas fa-edit"></i></button>
                    <button className="primary-button icon" title="Delete"><i className="fas fa-trash-alt"></i></button>
                    <button className="secondary-button icon" title="Info"><i className="fas fa-info-circle"></i>
                    </button>
                    <button className="icon" disabled title="Locked"><i className="fas fa-ban"></i></button>
                </div>

                <hr/>

                <h3>Card Rarity Key</h3>
                <div className="rarity-key">
                    <button
                        key="random"
                        className="rarity-item random"
                    >
                        Random
                    </button>
                    {rarities.map((r) => {
                        return (
                            <button
                                key={r.name}
                                className="rarity-item"
                                style={{"--item-color": r.color}}
                            >
                                {r.name}
                            </button>
                        );
                    })}
                </div>

                <hr/>

                <h2>Images</h2>
                <p>A responsive image:</p>
                <img
                    src="https://placehold.co/400x250/e680a7/ffffff?text=Responsive+Image"
                    alt="A great of the coolest thing"
                    style={{maxWidth: '100%', height: 'auto', display: 'block', margin: '10px 0'}}
                />
                <p>A smaller image:</p>
                <img
                    src="https://placehold.co/150/e680a7/fff"
                    alt="Another great of the coolest thing"
                    style={{width: '150px', height: '150px', display: 'block', margin: '10px 0'}}
                />

                <hr/>

                <h2><i className="fas fa-list"></i> Forms and Inputs</h2>

                <h3>Text Inputs</h3>
                <div>
                    <label htmlFor="textInput">Text Input (with label):</label>
                    <input type="text" id="textInput" name="textInput" placeholder="Enter text"/>
                </div>
                <div>
                    <input type="text" placeholder="Text Input (no label)"/>
                </div>
                <div>
                    <label htmlFor="passwordInput">Password:</label>
                    <input type="password" id="passwordInput" name="passwordInput" placeholder="Enter password"/>
                </div>
                <div>
                    <label htmlFor="emailInput">Email:</label>
                    <input type="email" id="emailInput" name="emailInput" placeholder="your@example.com"/>
                </div>
                <div>
                    <label htmlFor="numberInput">Number:</label>
                    <input type="number" id="numberInput" name="numberInput" placeholder="123"/>
                </div>
                <div>
                    <label htmlFor="urlInput">URL:</label>
                    <input type="url" id="urlInput" name="urlInput" placeholder="https://example.com"/>
                </div>
                <div>
                    <label htmlFor="telInput">Telephone:</label>
                    <input type="tel" id="telInput" name="telInput" placeholder="123-456-7890"/>
                </div>

                <h3>Textarea</h3>
                <div>
                    <label htmlFor="textArea">Textarea:</label>
                    <textarea id="textArea" name="textArea" rows="5" placeholder="Enter multiline text..."></textarea>
                </div>

                <h3>Select Dropdown</h3>
                <div>
                    <label htmlFor="selectDropdown">Select Option:</label>
                    <select id="selectDropdown" name="selectDropdown">
                        <option value="">--Please choose an option--</option>
                        <option value="option1">Option 1</option>
                        <option value="option2">Option 2</option>
                        <option value="option3">Option 3</option>
                    </select>
                </div>

                <h3>Checkboxes</h3>
                <div>
                    <div className="checkbox-wrapper">
                        <label htmlFor="checkbox1">Checkbox 1</label>
                        <input type="checkbox" id="checkbox1" name="checkboxGroup" value="value1"/>
                    </div>
                    <div className="checkbox-wrapper">
                        <label htmlFor="checkbox2">Checkbox 2 (Checked)</label>
                        <input type="checkbox" id="checkbox2" name="checkboxGroup" value="value2" checked/>
                    </div>
                    <div className="checkbox-wrapper">
                        <label htmlFor="checkbox3">Checkbox 3 (Disabled)</label>
                        <input type="checkbox" id="checkbox3" name="checkboxGroup" value="value3" disabled/>
                    </div>
                </div>

                <h3>Radio Buttons</h3>
                <div>
                    <label>Radio Buttons:</label>
                    <div className="checkbox-wrapper">
                        <label htmlFor="radio1">Radio 1</label>
                        <input type="radio" id="radio1" name="radioGroup" value="radio1"/>
                    </div>
                    <div className="checkbox-wrapper">
                        <label htmlFor="radio2">Radio 2 (Checked)</label>
                        <input type="radio" id="radio2" name="radioGroup" value="radio2" checked/>
                    </div>
                    <div className="checkbox-wrapper">
                        <label htmlFor="radio3">Radio 3 (Disabled)</label>
                        <input type="radio" id="radio3" name="radioGroup" value="radio3" disabled/>
                    </div>
                </div>

                <div>
                    <label>Inline Radio Toggle</label>
                    <div className="radio-toggle-group">
                        <div className="checkbox-wrapper">
                            <label htmlFor="toggleYes">Yes</label>
                            <input type="radio" id="toggleYes" name="featureToggle" value="yes"/>
                        </div>
                        <div className="checkbox-wrapper">
                            <label htmlFor="toggleNo">No</label>
                            <input type="radio" id="toggleNo" name="featureToggle" value="no" checked/>
                        </div>
                    </div>
                </div>

                <h3>Date and Time Inputs</h3>
                <div>
                    <label htmlFor="dateInput">Date:</label>
                    <input type="date" id="dateInput" name="dateInput"/>
                </div>
                <div>
                    <label htmlFor="timeInput">Time:</label>
                    <input type="time" id="timeInput" name="timeInput"/>
                </div>
                <div>
                    <label htmlFor="datetimeLocalInput">Local Date/Time:</label>
                    <input type="datetime-local" id="datetimeLocalInput" name="datetimeLocalInput"/>
                </div>

                <h3>Color and Range Inputs</h3>
                <div>
                    <label htmlFor="colorInput">Color Picker:</label>
                    <input type="color" id="colorInput" name="colorInput"/>
                </div>
                <div>
                    <label htmlFor="rangeInput">Range (Slider):</label>
                    <input
                        type="range"
                        id="rangeInput"
                        name="rangeInput"
                        min="0"
                        max="100"
                        defaultValue="50"
                        onChange={handleRangeChange}
                        onInput={handleRangeChange}
                        style={{'--range-progress': '50%'}}
                    />
                </div>

                <h3>File Input</h3>
                <div>
                    <label htmlFor="fileInput">File Upload:</label>
                    <input type="file" id="fileInput" name="fileInput"/>
                </div>

                <hr/>

                <h2>Lists</h2>
                <h3>Unordered List</h3>
                <ul>
                    <li>List Item 1</li>
                    <li>List Item 2
                        <ul>
                            <li>Nested List Item A</li>
                            <li>Nested List Item B</li>
                        </ul>
                    </li>
                    <li>List Item 3</li>
                </ul>

                <h3>Ordered List</h3>
                <ol>
                    <li>First Item</li>
                    <li>Second Item</li>
                    <li>Third Item</li>
                </ol>

                <h3>Definition List</h3>
                <dl>
                    <dt>Term 1</dt>
                    <dd>Definition for Term 1.</dd>
                    <dt>Term 2</dt>
                    <dd>Definition for Term 2, which can be longer and span multiple lines.</dd>
                </dl>

                <hr/>

                <h2>Tables</h2>
                <table>
                    <thead>
                    <tr>
                        <th>Header 1</th>
                        <th>Header 2</th>
                        <th>Header 3</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>Data 1.1</td>
                        <td>Data 1.2</td>
                        <td>Data 1.3</td>
                    </tr>
                    <tr>
                        <td>Data 2.1</td>
                        <td>Data 2.2</td>
                        <td>Data 2.3</td>
                    </tr>
                    <tr>
                        <td>Data 3.1</td>
                        <td>Data 3.2</td>
                        <td>Data 3.3</td>
                    </tr>
                    </tbody>
                    <tfoot>
                    <tr>
                        <td colSpan="3">Table Footer</td>
                    </tr>
                    </tfoot>
                </table>

                <hr/>

                <h2>Interactive Elements</h2>
                <details>
                    <summary>Click to reveal more information</summary>
                    <p>This is the hidden content that appears when you click the summary.</p>
                </details>

                <hr/>

                <h2>Miscellaneous</h2>
                <hr/>
                {/* Horizontal Rule */}
                <p>This is a paragraph after a horizontal rule.</p>
                <p>
                    A simple progress bar: <progress value="70" max="100">70%</progress>
                </p>
                <p>
                    A meter element: <meter value="0.6">60%</meter>
                </p>
                <br/><br/><br/>
                <p>End of Kitchen Sink.</p>
            </div>
        </>
    );
};

export default KitchenSink;
