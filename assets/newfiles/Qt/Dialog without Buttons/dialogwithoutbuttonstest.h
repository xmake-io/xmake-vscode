#ifndef DIALOGWITHOUTBUTTONSTEST_H
#define DIALOGWITHOUTBUTTONSTEST_H

#include <QDialog>

namespace Ui {
class DialogWithoutButtonsTest;
}

class DialogWithoutButtonsTest : public QDialog
{
    Q_OBJECT

public:
    explicit DialogWithoutButtonsTest(QWidget *parent = nullptr);
    ~DialogWithoutButtonsTest();

private:
    Ui::DialogWithoutButtonsTest *ui;
};

#endif // DIALOGWITHOUTBUTTONSTEST_H
