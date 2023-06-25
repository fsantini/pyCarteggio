# pyCarteggio
Software per esercizi di carteggio nautico sulla carta 5D. 

Questa applicazione è pensata per risolvere esercizi del carteggio nautico per l'esame della patente nautica
senza limiti dalla costa tramite una interfaccia semplificata ma corrispondente per quanto possibile agli strumenti
disponibili per il carteggio su una carta fisica.

## Installazione
Per installare l'applicazione è necessario avere installato Python 3.7 o superiore e il gestore di pacchetti pip.
Le dipendenze necessarie sono matplotlib e PyQt5. Per installarle, eseguire il seguente comando:
```
pip install -r requirements.txt
```
Per Windows, è disponibile un installatore nella pagina delle release.

## Utilizzo
Il programma offre tre strumenti per la risoluzione degli esercizi, che si selezionano tramite i pulsanti in basso
a destra della finestra.

In generale, cliccare su un pulsante crea un nuovo strumento, che diventa attivo. Cliccando col tasto sinistro e
destro del mouse modifica il comportamento dello strumento. 
Le informazioni relative ai vari elementi creati sulla carta si leggono sulla lista che si viene a comporre sul
lato destro della finestra.

### Coordinate
Questo strumento permette di ottenere le coordinate di un punto sulla carta. Per ottenere le coordinate, è necessario
cliccare col tasto sinistro sul punto desiderato. Le coordinate vengono visualizzate nella lista a destra.

### Linea
Questo strumento permette di tracciare una linea sulla carta. Per tracciare una linea, è necessario cliccare col tasto
sinistro su un punto della carta, e poi cliccare col tasto destro su un altro punto. La linea viene visualizzata
sulla carta, e la sua direzione viene visualizzata nella lista a destra. Come con una squadretta, le due direzioni
opposte vengono visualizzate come gradi, e sta all'utente scegliere quella giusta.

### Cerchio
Questo strumento permette di tracciare un cerchio sulla carta. Il tasto sinistro definisce il centro del cerchio,
mentre il tasto destro ne definisce il raggio. La circonferenza viene visualizzata sulla carta, e il raggio in miglia
viene visualizzato nella lista a destra.

### Zoom
Per zoomare sulla carta, cliccare sulla icono a forma di lente di ingrandimento nella parte alta della finestra, e 
tracciare il rettangolo sul quale si vuole zoomare. Per tornare alla vista normale, cliccare sulla icona a forma di
casetta.
Deselezionare lo strumento zoom cliccandoci nuovamente sopra prima di poter tracciare o modificare un elemento.
Dal menu a tendina in basso a destra, si possono selezionare alcune viste predefinite.