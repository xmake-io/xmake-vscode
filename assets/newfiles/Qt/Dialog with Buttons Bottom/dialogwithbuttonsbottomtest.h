#ifndef DIALOGWITHBUTTONSBOTTOMTEST_H
#define DIALOGWITHBUTTONSBOTTOMTEST_H

#include <QDialog>

namespace Ui {
class DialogWithButtonsBottomTest;
}

class DialogWithButtonsBottomTest : public QDialog
{
    Q_OBJECT

public:
    explicit DialogWithButtonsBottomTest(QWidget *parent = nullptr);
    ~DialogWithButtonsBottomTest();

private:
    Ui::DialogWithButtonsBottomTest *ui;
};

#endif // DIALOGWITHBUTTONSBOTTOMTEST_H
